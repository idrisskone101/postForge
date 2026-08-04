"use client";

import { useState, useEffect, useRef } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { getModelsByType } from "@/lib/ai/models";
import {
  Trash2,
  Loader2,
  User,
  Sparkles,
  Upload,
  ArrowLeft,
  X,
  Check,
  Image as ImageIcon,
  FileJson,
  AlertCircle,
} from "lucide-react";

const AVATAR_GENERATION_STYLE_PROMPT = [
  "Create a photorealistic avatar with a Pinterest-style pretty girl, soft baddie, girly pop UGC creator aesthetic.",
  "Use an iPhone influencer selfie feel with natural iPhone available light, slight grain, realistic skin texture, soft baby hairs, subtle flyaways, and imperfect real-photo sharpness.",
  "The person should feel attractive, warm, feminine, approachable, and aspirational, not intimidating.",
  "Favor warm medium tan glowing skin, brunette hair, full natural brows, almond brown eyes, glossy nude pink-brown lips, soft blush, clean-girl soft glam, gold hoop earrings, and feminine fitted basics such as a white cami, ribbed tank, baby tee, or simple white dress when relevant.",
  "Keep the look Pinterest attractive it-girl and relatable UGC creator, not overly polished, not glossy AI, not a studio headshot, not cold high-fashion editorial retouching.",
].join(" ");

export function buildAvatarGenerationPrompt(userPrompt: string): string {
  return `${AVATAR_GENERATION_STYLE_PROMPT} User direction: ${userPrompt.trim()}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Seed Reference Image could not be read."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Seed Reference Image could not be read."));
    reader.readAsDataURL(file);
  });
}

interface Avatar {
  id: string;
  name: string;
  createdAt: string;
  origin?: "uploaded" | "imported" | "generated" | "gallery";
  identityPack?: {
    id: string;
    status: "queued" | "processing" | "completed" | "failed";
    error: string | null;
  } | null;
}

interface AvatarPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type Mode = "grid" | "generate" | "gallery" | "import";

export function getAvatarActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AvatarActionErrorNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-w-0 items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1 break-words text-xs leading-5 [overflow-wrap:anywhere]">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="grid size-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-destructive/10"
        aria-label="Dismiss avatar error"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

interface GalleryFile {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface AvatarSeedReferenceImage {
  name: string;
  size: number;
  type: string;
}

export function getAvatarOptionLabel(index: number): string {
  return `Identity ${index + 1}`;
}

export function getAvatarOriginLabel(origin: Avatar["origin"]): string | null {
  if (origin === "imported") return "Imported";
  if (origin === "generated") return "Generated";
  if (origin === "gallery") return "Gallery";
  return null;
}

export function getAvatarIdentityPackStatusLabel(identityPack: Avatar["identityPack"]): string {
  if (!identityPack) return "Identity preparing";

  if (identityPack.status === "completed") return "Identity ready";
  if (identityPack.status === "failed") return "Identity failed - retry available";

  return "Identity preparing";
}

export function getAvatarImportReadiness(rawJson: string, seedReferenceImageCount: number) {
  let jsonError: string | null = null;
  let seedError: string | null = null;

  try {
    JSON.parse(rawJson);
  } catch {
    jsonError = "Avatar Profile must be valid JSON.";
  }

  if (seedReferenceImageCount < 1) {
    seedError = "Add at least 1 Seed Reference Image.";
  } else if (seedReferenceImageCount > 5) {
    seedError = "Use no more than 5 Seed Reference Images.";
  }

  return {
    canGenerateCandidates: !jsonError && !seedError,
    jsonError,
    seedError,
  };
}

export function getDefaultAvatarImportName(rawJson: string): string {
  try {
    const profile = JSON.parse(rawJson) as { name?: unknown; displayName?: unknown };
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    if (name) return name.slice(0, 40);

    const displayName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
    if (displayName) return displayName.slice(0, 40);
  } catch {
    return "Imported Avatar";
  }

  return "Imported Avatar";
}

export interface AvatarCandidateGenerationRequest {
  prompt: string;
  model: "nano-banana-2";
  aspectRatio: "9:16";
  numImages: 3;
  referenceImageUrls: string[];
}

export interface AvatarCandidateArtifact {
  fileId: string;
}

export interface AvatarCandidateSet {
  jobId: string;
  candidates: AvatarCandidateArtifact[];
}

export interface AvatarImportDraft {
  rawJson: string;
  seedReferenceImages: AvatarSeedReferenceImage[];
  candidateSets: AvatarCandidateSet[];
  generationError: string | null;
}

export function appendAvatarCandidateSet(
  currentSets: AvatarCandidateSet[],
  nextSet: AvatarCandidateSet
): AvatarCandidateSet[] {
  return [...currentSets, nextSet];
}

export function resetAvatarImportDraft(): AvatarImportDraft {
  return {
    rawJson: "",
    seedReferenceImages: [],
    candidateSets: [],
    generationError: null,
  };
}

export function buildAvatarCandidateGenerationRequest({
  rawJson,
  seedReferenceImageUrls,
}: {
  rawJson: string;
  seedReferenceImageUrls: string[];
}): AvatarCandidateGenerationRequest {
  const profile = JSON.parse(rawJson);

  return {
    model: "nano-banana-2",
    aspectRatio: "9:16",
    numImages: 3,
    referenceImageUrls: seedReferenceImageUrls,
    prompt: [
      "Generate single-image avatar candidates for review: each output is exactly one standalone vertical 9:16 selfie of a single person.",
      "Render every candidate as a real, slightly low-quality iPhone front-camera selfie — a candid phone snapshot, NOT a clean studio portrait and NOT a polished AI render.",
      "Bake in authentic phone-photo imperfection: visible sensor grain and digital noise (stronger in shadows), soft and slightly blurry front-camera focus that is not razor-sharp, mild JPEG/compression texture, front-camera flatness with modest dynamic range, a subtle warm color cast, and a slight lens vignette. Lean low-resolution, like a slightly soft saved Instagram-story screenshot rather than a crisp high-megapixel photo.",
      "Keep skin real and visibly unretouched: real pores, faint under-eye texture, light freckles or a small beauty mark, mild uneven and patchy skin tone, natural lip lines, tiny flyaway hairs, slight shine or oiliness in the T-zone, faint blemishes or natural redness, and slight natural facial asymmetry. It should clearly read as a real unfiltered face. No beauty-filter smoothing, no airbrushing, no poreless or waxy plastic skin, no glossy AI sheen.",
      "Match the Seed Reference Images closely: facial structure, skin tone, hair color and texture, brow shape, eye shape, lip shape, and expression range should stay close. Preserve the same stable core identity and distinctive traits so this is not a generic default avatar or another existing brunette creator face; do not invent a different face.",
      "Keep her attractive with soft, tasteful sex appeal through confident eye contact, a relaxed flirty expression, feminine posture, and a flattering crop, with naturally full nude-glossy lips that still look real — sun-kissed and pretty, never explicit, never oversexualized, never plastic.",
      "Vary wardrobe and color across candidates with tasteful, mildly revealing Pinterest-style outfits: crop tops, off-shoulder tops, fitted tanks, ribbed camis, halter-style tops, baby tees, corset-style tops, slip dresses, oversized button-ups worn open over a top, denim, or athleisure in different colors; do not repeat the same white-cami look every time.",
      "Use candid selfie framing at eye level or a slight handheld angle, subject caught mid-sentence with lips slightly parted and eyes toward the camera, in casual available light (natural window light, warm sunlight, overhead room light, or soft indoor ambient) that can be slightly uneven or unflattering and casts real shine, shadow, and texture across the skin instead of even beauty lighting; close-up to half-body crop, no full-body editorial setup.",
      "Keep a believable real-life background with true context — bedroom, kitchen, car, cafe, bar, mirror, street, or outdoor setting — lightly blurred but recognizable, never a blank studio backdrop.",
      "The result must read as a real person's casual phone selfie: imperfect, candid, lightly low-fidelity, and believable — not flawless, not glossy, not overly polished, not editorial, not a studio headshot.",
      "Strictly avoid an AI beauty-render look, 3D/CGI smoothness, over-smoothed skin, studio or ring-light lighting with perfect catchlights, perfectly symmetrical features, HDR over-sharpening, and magazine retouching.",
      "Use all provided Seed Reference Images as the identity reference set for every candidate.",
      "Do not combine or collage the seed images into the output.",
      "No collage, no contact sheet, no multi-panel layout, no grid, no split-screen, no before-and-after comparison; exactly one person per image.",
      `Avatar Profile JSON: ${JSON.stringify(profile)}`,
    ].join(" "),
  };
}

interface AvatarCreationCardProps {
  isUploading: boolean;
  onUpload: () => void;
  onGenerate: () => void;
  onGallery: () => void;
  onImport: () => void;
}

export function AvatarCreationCard({
  isUploading,
  onUpload,
  onGenerate,
  onGallery,
  onImport,
}: AvatarCreationCardProps) {
  return (
    <div className="flex min-h-[168px] flex-col rounded-xl border border-dashed border-border bg-muted/25 p-2.5">
      <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg bg-muted/35 text-center">
        <Sparkles className="size-6 text-muted-foreground/70" />
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          New Avatar
        </p>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground/70">
          Upload, generate, import, or choose from gallery.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          data-avatar-action="upload"
          onClick={onUpload}
          disabled={isUploading}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/35 text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="text-[11px] font-bold uppercase tracking-wide">Upload</span>
        </button>

        <button
          type="button"
          data-avatar-action="generate"
          onClick={onGenerate}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/35 text-muted-foreground transition-colors hover:border-accent-blue hover:text-accent-blue"
        >
          <Sparkles className="size-4" />
          <span className="text-[11px] font-bold uppercase tracking-wide">Generate</span>
        </button>

        <button
          type="button"
          data-avatar-action="import"
          onClick={onImport}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/35 text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green"
        >
          <FileJson className="size-4" />
          <span className="text-[11px] font-bold uppercase tracking-wide">Import</span>
        </button>

        <button
          type="button"
          data-avatar-action="gallery"
          onClick={onGallery}
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/35 text-muted-foreground transition-colors hover:border-accent-coral hover:text-accent-coral"
        >
          <ImageIcon className="size-4" />
          <span className="text-[11px] font-bold uppercase tracking-wide">Gallery</span>
        </button>
      </div>
    </div>
  );
}

interface AvatarOptionCardProps {
  avatar: Avatar;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (event: React.MouseEvent) => void;
}

export function AvatarOptionCard({
  avatar,
  label,
  isSelected,
  onSelect,
  onDelete,
}: AvatarOptionCardProps) {
  const originLabel = getAvatarOriginLabel(avatar.origin);
  const identityStatusLabel = getAvatarIdentityPackStatusLabel(avatar.identityPack);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-muted/35 p-2.5 shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        isSelected
          ? "border-accent-green shadow-[0_0_0_2px_rgba(123,165,67,0.16),var(--pf-shadow-sm)]"
          : "border-border hover:-translate-y-0.5 hover:border-accent-green/45 hover:bg-muted/55 hover:shadow-[var(--pf-shadow-md)]"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/avatars/${avatar.id}`}
            alt={label}
            className="size-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-semibold text-foreground">
            {label}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
              isSelected
                ? "bg-accent-green/15 text-accent-green"
                : "bg-muted/40 text-muted-foreground"
            )}
          >
            {isSelected ? "Active" : "Select"}
          </span>
        </div>

        <div className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5">
          {originLabel && (
            <span className="rounded-full border border-border bg-muted/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {originLabel}
            </span>
          )}
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              avatar.identityPack?.status === "completed"
                ? "border-accent-green/25 bg-accent-green/10 text-accent-green"
                : avatar.identityPack?.status === "failed"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-accent-blue/25 bg-accent-blue/10 text-accent-blue"
            )}
          >
            {identityStatusLabel}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity hover:bg-destructive focus:opacity-100 group-hover:opacity-100"
        aria-label={`Delete ${label}`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

interface AvatarImportPanelProps {
  rawJson: string;
  avatarName?: string;
  seedReferenceImages: AvatarSeedReferenceImage[];
  candidateSets?: AvatarCandidateSet[];
  isGeneratingCandidates: boolean;
  generationError: string | null;
  onBack: () => void;
  onAvatarNameChange?: (value: string) => void;
  onRawJsonChange: (value: string) => void;
  onJsonFileChange: (files: FileList | null) => void;
  onSeedReferenceImagesChange: (files: FileList | null) => void;
  onRemoveSeedReferenceImage: (index: number) => void;
  onGenerateCandidates: () => void;
  onAcceptCandidate?: (fileId: string) => void;
}

export function AvatarImportPanel({
  rawJson,
  avatarName,
  seedReferenceImages,
  candidateSets = [],
  isGeneratingCandidates,
  generationError,
  onBack,
  onAvatarNameChange,
  onRawJsonChange,
  onJsonFileChange,
  onSeedReferenceImagesChange,
  onRemoveSeedReferenceImage,
  onGenerateCandidates,
  onAcceptCandidate,
}: AvatarImportPanelProps) {
  const readiness = getAvatarImportReadiness(rawJson, seedReferenceImages.length);
  const resolvedAvatarName = avatarName ?? getDefaultAvatarImportName(rawJson);
  const candidateCount = candidateSets.reduce(
    (total, set) => total + set.candidates.length,
    0
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to avatars
      </button>

      <div className="rounded-xl border border-border bg-muted/35 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
            <FileJson className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Import Avatar</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add raw Avatar Profile JSON and 1 to 5 Seed Reference Images.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Avatar name
        </label>
        <input
          type="text"
          value={resolvedAvatarName}
          onChange={(event) => onAvatarNameChange?.(event.target.value)}
          maxLength={40}
          className="w-full rounded-xl border border-border bg-muted/35 px-3 py-2 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent-green/45"
          placeholder="Imported Avatar"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Avatar Profile JSON
          </label>
          <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green">
            Upload JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => onJsonFileChange(event.target.files)}
            />
          </label>
        </div>
        <Textarea
          value={rawJson}
          onChange={(event) => onRawJsonChange(event.target.value)}
          placeholder={`{
  "name": "Imported Avatar"
}`}
          className="min-h-[160px] resize-y rounded-xl border-border bg-muted/35 font-mono text-xs text-foreground/90 placeholder:text-muted-foreground/70"
        />
        {readiness.jsonError && (
          <p className="min-w-0 break-words text-xs font-medium text-destructive [overflow-wrap:anywhere]">{readiness.jsonError}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Seed Reference Images
          </label>
          <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green">
            Upload Images
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => onSeedReferenceImagesChange(event.target.files)}
            />
          </label>
        </div>

        {seedReferenceImages.length > 0 ? (
          <div className="space-y-2">
            {seedReferenceImages.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground/90">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{file.type || "image"} · {Math.round(file.size / 1024)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSeedReferenceImage(index)}
                  aria-label={`Remove ${file.name}`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-6 text-center text-xs text-muted-foreground">
            Upload 1 to 5 Seed Reference Images.
          </div>
        )}

        {readiness.seedError && (
          <p className="min-w-0 break-words text-xs font-medium text-destructive [overflow-wrap:anywhere]">{readiness.seedError}</p>
        )}
      </div>

      {generationError && (
        <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive [overflow-wrap:anywhere]">
          {generationError}
        </div>
      )}

      {candidateCount > 0 && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/35 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Avatar Candidates</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Review generated candidates before saving one as an Avatar.
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerateCandidates}
              disabled={!readiness.canGenerateCandidates || isGeneratingCandidates}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              Regenerate Candidates
            </button>
          </div>

          {isGeneratingCandidates && (
            <div className="flex items-center gap-2 rounded-lg border border-accent-green/20 bg-accent-green/5 px-3 py-2 text-xs font-medium text-accent-green">
              <Loader2 className="size-3.5 animate-spin" />
              Generating another candidate set. Previous candidates stay available for review.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {candidateSets.flatMap((set) => set.candidates).map((candidate, index) => (
              <div
                key={candidate.fileId}
                className="overflow-hidden rounded-lg border border-border bg-muted/35"
              >
                <div className="aspect-[3/4] bg-black">
                  <img
                    src={`/api/files/${candidate.fileId}`}
                    alt={`Candidate ${index + 1}`}
                    className="size-full object-cover"
                  />
                </div>
                <div className="space-y-2 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Candidate {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAcceptCandidate?.(candidate.fileId)}
                    className="w-full rounded-md bg-accent-coral px-2 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#e9421c]"
                  >
                    Use Candidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerateCandidates}
        disabled={!readiness.canGenerateCandidates || isGeneratingCandidates}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e9421c] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGeneratingCandidates ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Generate candidates
      </button>
    </div>
  );
}

interface JobResult {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  outputs: {
    id: string;
    type: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  }[];
}

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<Mode>("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate state
  const [genPrompt, setGenPrompt] = useState("");
  const [genModel, setGenModel] = useState("nano-banana");
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genJob, setGenJob] = useState<JobResult | null>(null);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);

  // Gallery state
  const [galleryFiles, setGalleryFiles] = useState<GalleryFile[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [savingFileId, setSavingFileId] = useState<string | null>(null);

  // Import state
  const [importRawJson, setImportRawJson] = useState("");
  const [importAvatarName, setImportAvatarName] = useState("Imported Avatar");
  const [seedReferenceImages, setSeedReferenceImages] = useState<File[]>([]);
  const [avatarCandidateSets, setAvatarCandidateSets] = useState<AvatarCandidateSet[]>([]);
  const [importCandidateJobId, setImportCandidateJobId] = useState<string | null>(null);
  const [isGeneratingImportCandidates, setIsGeneratingImportCandidates] = useState(false);
  const [importGenerationError, setImportGenerationError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const imageModels = getModelsByType("image");

  const fetchAvatars = async () => {
    try {
      setActionError(null);
      const data = await apiGet<Avatar[]>("/api/avatars");
      setAvatars(data);
    } catch (err) {
      console.error("Failed to load avatars:", err);
      setActionError(getAvatarActionErrorMessage(err, "Failed to load saved identities."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));

      const response = await fetch("/api/avatars", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const avatar = await response.json();
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      setActionError(getAvatarActionErrorMessage(err, "Avatar upload failed."));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    try {
      await apiDelete(`/api/avatars/${id}`);
      setAvatars((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) {
        onSelect("");
      }
    } catch (err) {
      console.error("Failed to delete avatar:", err);
      setActionError(getAvatarActionErrorMessage(err, "Avatar could not be deleted."));
    }
  };

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;

    try {
      setActionError(null);
      const enhancedPrompt = buildAvatarGenerationPrompt(genPrompt);
      const result = await apiPost<{ id: string }>("/api/generate/images", {
        prompt: enhancedPrompt,
        model: genModel,
        aspectRatio: "1:1",
        numImages: 1,
      });
      setGenJobId(result.id);
    } catch (err) {
      console.error("Failed to start generation:", err);
      setActionError(getAvatarActionErrorMessage(err, "Failed to start avatar generation."));
    }
  };

  // Poll for generation job completion
  useEffect(() => {
    if (!genJobId) {
      setGenJob(null);
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const result = await apiGet<JobResult>(`/api/jobs/${genJobId}`);
        if (!active) return;
        setActionError(null);
        setGenJob(result);
        if (result.status !== "completed" && result.status !== "failed") {
          timeoutId = setTimeout(poll, 3000);
        }
      } catch (err) {
        console.error("Failed to poll job:", err);
        setActionError(
          getAvatarActionErrorMessage(err, "Avatar generation status is temporarily unavailable.")
        );
        if (active) {
          timeoutId = setTimeout(poll, 5000);
        }
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [genJobId]);

  const handleSaveGenerated = async (fileId: string) => {
    setIsSavingGenerated(true);
    setActionError(null);
    try {
      const avatar = await apiPost<Avatar>("/api/avatars/from-generation", {
        fileId,
        name: genPrompt.slice(0, 40) || "AI Avatar",
      });
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
      // Reset generate state
      setMode("grid");
      setGenJobId(null);
      setGenPrompt("");
    } catch (err) {
      console.error("Failed to save avatar:", err);
      setActionError(getAvatarActionErrorMessage(err, "Generated avatar could not be saved."));
    } finally {
      setIsSavingGenerated(false);
    }
  };

  const openGallery = async () => {
    setMode("gallery");
    setIsLoadingGallery(true);
    setActionError(null);
    try {
      const files = await apiGet<GalleryFile[]>("/api/files?type=image&limit=50");
      setGalleryFiles(files);
    } catch (err) {
      console.error("Failed to load gallery:", err);
      setActionError(getAvatarActionErrorMessage(err, "Failed to load gallery images."));
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handlePickFromGallery = async (fileId: string) => {
    setSavingFileId(fileId);
    setActionError(null);
    try {
      const avatar = await apiPost<Avatar>("/api/avatars/from-generation", {
        fileId,
        name: "Gallery Import",
      });
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
      setMode("grid");
    } catch (err) {
      console.error("Failed to save gallery image as avatar:", err);
      setActionError(getAvatarActionErrorMessage(err, "Gallery image could not be saved as an avatar."));
    } finally {
      setSavingFileId(null);
    }
  };

  const resetGenerate = () => {
    setMode("grid");
    setGenJobId(null);
    setGenPrompt("");
  };

  const handleImportJsonFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setImportGenerationError(null);
    try {
      const rawJson = await file.text();
      setImportRawJson(rawJson);
      setImportAvatarName(getDefaultAvatarImportName(rawJson));
    } catch {
      setImportGenerationError("Avatar Profile JSON file could not be read.");
    }
  };

  const handleSeedReferenceImages = (files: FileList | null) => {
    if (!files) return;
    setImportGenerationError(null);
    setSeedReferenceImages((current) => [...current, ...Array.from(files)]);
  };

  const handleRemoveSeedReferenceImage = (index: number) => {
    setImportGenerationError(null);
    setSeedReferenceImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleGenerateImportCandidates = async () => {
    const readiness = getAvatarImportReadiness(importRawJson, seedReferenceImages.length);
    if (!readiness.canGenerateCandidates) return;

    setIsGeneratingImportCandidates(true);
    setImportGenerationError(null);
    try {
      const seedReferenceImageUrls = await Promise.all(
        seedReferenceImages.map(readFileAsDataUrl)
      );
      const result = await apiPost<{ id: string }>("/api/generate/images", buildAvatarCandidateGenerationRequest({
        rawJson: importRawJson,
        seedReferenceImageUrls,
      }));
      setImportCandidateJobId(result.id);
    } catch {
      setImportGenerationError("Candidate generation failed. Your inputs are still available for retry.");
      setIsGeneratingImportCandidates(false);
    }
  };

  useEffect(() => {
    if (!importCandidateJobId) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const result = await apiGet<JobResult>(`/api/jobs/${importCandidateJobId}`);
        if (!active) return;

        if (result.status === "completed") {
          setAvatarCandidateSets((current) => appendAvatarCandidateSet(current, {
            jobId: result.id,
            candidates: result.outputs
              .filter((output) => output.type === "image")
              .map((output) => ({ fileId: output.id })),
          }));
          setImportCandidateJobId(null);
          setIsGeneratingImportCandidates(false);
          return;
        }

        if (result.status === "failed") {
          setImportGenerationError(
            result.error || "Candidate generation failed. Your inputs are still available for retry."
          );
          setImportCandidateJobId(null);
          setIsGeneratingImportCandidates(false);
          return;
        }

        timeoutId = setTimeout(poll, 3000);
      } catch {
        if (!active) return;
        timeoutId = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [importCandidateJobId]);

  const abandonImport = () => {
    const cleared = resetAvatarImportDraft();
    setImportRawJson(cleared.rawJson);
    setImportAvatarName("Imported Avatar");
    setSeedReferenceImages([]);
    setAvatarCandidateSets(cleared.candidateSets);
    setImportGenerationError(cleared.generationError);
    setImportCandidateJobId(null);
    setIsGeneratingImportCandidates(false);
    setMode("grid");
  };

  const handleAcceptImportCandidate = async (fileId: string) => {
    setIsSavingGenerated(true);
    try {
      const result = await apiPost<{ avatar: Avatar }>("/api/avatars/import-candidate", {
        fileId,
        name: importAvatarName,
        rawAvatarProfileJson: importRawJson,
        seedReferenceImages: seedReferenceImages.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
        candidateFileIds: avatarCandidateSets.flatMap((set) =>
          set.candidates.map((candidate) => candidate.fileId)
        ),
      });
      setAvatars((prev) => [result.avatar, ...prev]);
      onSelect(result.avatar.id);
      abandonImport();
    } catch (err) {
      console.error("Failed to accept imported avatar candidate:", err);
      setImportGenerationError("Candidate could not be saved as an Avatar.");
    } finally {
      setIsSavingGenerated(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  // Generate mode
  if (mode === "generate") {
    const isGenerating = genJobId && (!genJob || genJob.status === "queued" || genJob.status === "processing");
    const isCompleted = genJob?.status === "completed" && genJob.outputs.length > 0;
    const isFailed = genJob?.status === "failed";

    return (
      <div className="space-y-4">
        {actionError && (
          <AvatarActionErrorNotice
            message={actionError}
            onDismiss={() => setActionError(null)}
          />
        )}
        <button
          type="button"
          onClick={resetGenerate}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to avatars
        </button>

        {!genJobId && (
          <>
            <Textarea
              placeholder="Describe the person: age, gender, hair, skin tone, expression. e.g. 'Woman in her late 20s, dark wavy hair, warm smile, light skin'"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value.slice(0, 500))}
              maxLength={500}
              className="min-h-[100px] resize-none bg-muted border-2 border-transparent focus:border-accent-green/30 focus:bg-card rounded-2xl p-4 text-sm transition-all"
            />
            <p className="text-[10px] text-muted-foreground">
              Quality modifiers (studio lighting, clean background, etc.) are added automatically.
            </p>

            {/* Model selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Model
              </label>
              <div className="flex flex-wrap gap-2">
                {imageModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGenModel(m.id)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                      genModel === m.id
                        ? "border-accent-green bg-accent-green/10 text-accent-green"
                        : "border-border text-muted-foreground hover:border-accent-green/50"
                    )}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!genPrompt.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e9421c] disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              Generate Avatar
            </button>
          </>
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-green" />
            <p className="text-sm font-medium">Generating avatar...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="flex min-w-0 flex-col items-center justify-center gap-3 py-8">
            <p className="min-w-0 max-w-full break-words text-center text-sm text-destructive [overflow-wrap:anywhere]">Generation failed{genJob?.error ? `: ${genJob.error}` : ""}</p>
            <button
              type="button"
              onClick={() => setGenJobId(null)}
              className="text-sm text-accent-green hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Completed — show result and save button */}
        {isCompleted && genJob && (
          <div className="space-y-4">
            <div className="relative aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-accent-green">
              <img
                src={`/api/files/${genJob.outputs[0].id}`}
                alt="Generated avatar"
                className="size-full object-cover"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGenJobId(null)}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted flex items-center justify-center gap-2"
              >
                <X className="size-4" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => handleSaveGenerated(genJob.outputs[0].id)}
                disabled={isSavingGenerated}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e9421c] disabled:opacity-50"
              >
                {isSavingGenerated ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Use as Avatar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Gallery mode
  if (mode === "gallery") {
    return (
      <div className="space-y-4">
        {actionError && (
          <AvatarActionErrorNotice
            message={actionError}
            onDismiss={() => setActionError(null)}
          />
        )}
        <button
          type="button"
          onClick={() => setMode("grid")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to avatars
        </button>

        {isLoadingGallery ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : galleryFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <ImageIcon className="size-8 mb-2" />
            <p className="text-sm">No generated images yet</p>
            <p className="text-xs mt-1">Generate some images first, then pick them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => handlePickFromGallery(file.id)}
                disabled={savingFileId === file.id}
                className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-border transition-all hover:border-accent-green/50"
              >
                <img
                  src={`/api/files/${file.id}`}
                  alt={file.filename}
                  className="size-full object-cover"
                />
                {savingFileId === file.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="size-6 text-white animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-accent-green/0 group-hover:bg-accent-green/10 transition-colors flex items-center justify-center">
                  <Check className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === "import") {
    return (
      <AvatarImportPanel
        rawJson={importRawJson}
        avatarName={importAvatarName}
        seedReferenceImages={seedReferenceImages}
        candidateSets={avatarCandidateSets}
        isGeneratingCandidates={isGeneratingImportCandidates}
        generationError={importGenerationError ?? actionError}
        onBack={abandonImport}
        onAvatarNameChange={(value) => {
          setImportGenerationError(null);
          setImportAvatarName(value.slice(0, 40));
        }}
        onRawJsonChange={(value) => {
          setImportGenerationError(null);
          setImportRawJson(value);
          setImportAvatarName(getDefaultAvatarImportName(value));
        }}
        onJsonFileChange={handleImportJsonFile}
        onSeedReferenceImagesChange={handleSeedReferenceImages}
        onRemoveSeedReferenceImage={handleRemoveSeedReferenceImage}
        onGenerateCandidates={handleGenerateImportCandidates}
        onAcceptCandidate={handleAcceptImportCandidate}
      />
    );
  }

  // Grid mode (default)
  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedId);
  const orderedAvatars = (
    selectedAvatar
      ? [selectedAvatar, ...avatars.filter((avatar) => avatar.id !== selectedAvatar.id)]
      : avatars
  );

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {actionError && (
        <AvatarActionErrorNotice
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      <div className="grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto pr-1 2xl:grid-cols-3">
        {orderedAvatars.map((avatar, index) => {
          const isSelected = selectedId === avatar.id;
          const sourceIndex = avatars.findIndex((candidate) => candidate.id === avatar.id);
          const avatarLabel = getAvatarOptionLabel(sourceIndex >= 0 ? sourceIndex : index);
          return (
            <AvatarOptionCard
              key={avatar.id}
              avatar={avatar}
              label={avatarLabel}
              isSelected={isSelected}
              onSelect={() => onSelect(avatar.id)}
              onDelete={(event) => handleDelete(avatar.id, event)}
            />
          );
        })}

        {orderedAvatars.length === 0 && (
          <div className="flex min-h-[168px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 py-6 text-muted-foreground">
            <User className="mb-2 size-7" />
            <p className="text-xs font-semibold">No saved identities yet</p>
          </div>
        )}

        <AvatarCreationCard
          isUploading={isUploading}
          onUpload={() => fileInputRef.current?.click()}
          onGenerate={() => setMode("generate")}
          onGallery={openGallery}
          onImport={() => setMode("import")}
        />
      </div>
    </div>
  );
}
