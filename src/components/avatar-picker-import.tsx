"use client";

import { ArrowLeft, FileJson, Loader2, Sparkles, X } from "lucide-react";
import {
  getAvatarImportReadiness,
  getDefaultAvatarImportName,
  type AvatarCandidateSet,
  type AvatarSeedReferenceImage,
} from "@/lib/avatar-workflow";
import { Textarea } from "@/components/ui/textarea";

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
}: {
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
}) {
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
          <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green">
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
          <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green">
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
                  <p className="text-[12px] text-muted-foreground">{file.type || "image"} · {Math.round(file.size / 1024)} KB</p>
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
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent-green hover:text-accent-green disabled:cursor-not-allowed disabled:opacity-50"
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
                  <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    Candidate {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAcceptCandidate?.(candidate.fileId)}
                    className="w-full rounded-md bg-accent-coral px-2 py-1.5 text-[12px] font-semibold text-white transition-colors hover:brightness-[0.93]"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition-colors hover:brightness-[0.93] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGeneratingCandidates ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Generate candidates
      </button>
    </div>
  );
}
