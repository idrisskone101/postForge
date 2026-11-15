"use client";

import { useId } from "react";
import {
  getAvatarImportReadiness,
  getDefaultAvatarImportName,
  type AvatarCandidateSet,
  type AvatarSeedReferenceImage,
} from "@/lib/avatar-workflow";
import { cn } from "@/lib/utils";
import { Button, buttonClass, Icon, IconButton, Meter } from "@/components/workbench";
import { AvatarPickerModeHead } from "@/components/avatar-picker-mode-head";

export type AvatarImportWorkspace = {
  rawJson: string;
  avatarName?: string;
  seedReferenceImages: AvatarSeedReferenceImage[];
  candidateSets?: AvatarCandidateSet[];
  isGeneratingCandidates: boolean;
  generationError: string | null;
  onAvatarNameChange?: (value: string) => void;
  onRawJsonChange: (value: string) => void;
  onJsonFileChange: (files: FileList | null) => void;
  onSeedReferenceImagesChange: (files: FileList | null) => void;
  onRemoveSeedReferenceImage: (index: number) => void;
  onGenerateCandidates: () => void;
  onAcceptCandidate?: (fileId: string) => void;
};

export function AvatarImportPanel({
  workspace,
  onBack,
}: {
  workspace: AvatarImportWorkspace;
  onBack: () => void;
}) {
  const {
    rawJson,
    avatarName,
    seedReferenceImages,
    candidateSets = [],
    isGeneratingCandidates,
    generationError,
    onAvatarNameChange,
    onRawJsonChange,
    onJsonFileChange,
    onSeedReferenceImagesChange,
    onRemoveSeedReferenceImage,
    onGenerateCandidates,
    onAcceptCandidate,
  } = workspace;
  const fieldId = useId();
  const readiness = getAvatarImportReadiness(rawJson, seedReferenceImages.length);
  const resolvedAvatarName = avatarName ?? getDefaultAvatarImportName(rawJson);
  const candidateCount = candidateSets.reduce(
    (total, set) => total + set.candidates.length,
    0
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <AvatarPickerModeHead title="Import avatar" onBack={onBack} />

      <div className="wb-field">
        <label htmlFor={`${fieldId}-name`} className="wb-label">
          Avatar name
        </label>
        <input
          id={`${fieldId}-name`}
          type="text"
          value={resolvedAvatarName}
          onChange={(event) => onAvatarNameChange?.(event.target.value)}
          maxLength={40}
          className="wb-input"
          placeholder="Imported avatar"
        />
      </div>

      <div className="wb-field">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${fieldId}-json`} className="wb-label">
            Avatar profile JSON
          </label>
          <label className={cn(buttonClass("quiet", 32), FILE_PILL)}>
            Upload JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => onJsonFileChange(event.target.files)}
            />
          </label>
        </div>
        <textarea
          id={`${fieldId}-json`}
          value={rawJson}
          onChange={(event) => onRawJsonChange(event.target.value)}
          aria-invalid={readiness.jsonError ? true : undefined}
          placeholder={`{
  "name": "Imported Avatar"
}`}
          className="wb-input min-h-[140px] font-mono text-[13px] leading-5"
        />
        {readiness.jsonError && (
          <p className="wb-field-error min-w-0 break-words [overflow-wrap:anywhere]">{readiness.jsonError}</p>
        )}
      </div>

      <div className="wb-field">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="wb-label">Seed reference images</span>
            <span className="wb-mono text-fg-muted">{seedReferenceImages.length} / 5</span>
          </span>
          <label className={cn(buttonClass("quiet", 32), FILE_PILL)}>
            Upload images
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => onSeedReferenceImagesChange(event.target.files)}
            />
          </label>
        </div>

        {seedReferenceImages.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {seedReferenceImages.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex min-h-12 items-center gap-3 rounded-lg bg-raised py-1.5 pl-3.5 pr-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-4 text-fg">{file.name}</p>
                  <p className="wb-mono text-fg-secondary">
                    {file.type || "image"} · {Math.round(file.size / 1024)} KB
                  </p>
                </div>
                <IconButton
                  icon="x"
                  label={`Remove ${file.name}`}
                  variant="ghost"
                  size={28}
                  onClick={() => onRemoveSeedReferenceImage(index)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-edge px-4 py-5 text-center text-[13px] leading-4 text-fg-muted">
            No images yet
          </p>
        )}

        {readiness.seedError && (
          <p className="wb-field-error min-w-0 break-words [overflow-wrap:anywhere]">{readiness.seedError}</p>
        )}
      </div>

      {generationError && (
        <p role="alert" className="wb-notice min-w-0 break-words text-bad [overflow-wrap:anywhere]" data-tone="bad">
          {generationError}
        </p>
      )}

      {candidateCount > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[14px] font-bold leading-[18px] text-fg">Avatar candidates</h4>
            <Button
              size={32}
              onClick={onGenerateCandidates}
              disabled={!readiness.canGenerateCandidates || isGeneratingCandidates}
            >
              Regenerate candidates
            </Button>
          </div>

          {isGeneratingCandidates && (
            <div role="status" className="flex flex-col gap-2">
              <p className="text-[13px] leading-4 text-fg-secondary">
                Generating another candidate set. Previous candidates stay available for review.
              </p>
              <Meter label="Candidate generation in progress" value={100} running className="flex-none" />
            </div>
          )}

          {/* 200px tracks give three columns in the 708px step, as drawn, and one on a phone. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {candidateSets.flatMap((set) => set.candidates).map((candidate, index) => (
              <div key={candidate.fileId} className="flex min-w-0 flex-col gap-2">
                <div className="wb-tile h-[280px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/${candidate.fileId}`} alt={`Candidate ${index + 1}`} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold leading-4 text-fg">Candidate {index + 1}</span>
                  <Button variant="strong" size={32} onClick={() => onAcceptCandidate?.(candidate.fileId)}>
                    Use candidate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button
          variant="strong"
          onClick={onGenerateCandidates}
          disabled={!readiness.canGenerateCandidates || isGeneratingCandidates}
        >
          <Icon name="generate" size={16} />
          Generate candidates
        </Button>
      </div>
    </div>
  );
}

const FILE_PILL =
  "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember";
