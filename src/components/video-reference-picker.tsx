"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { FileImage } from "@/components/file-image";
import { Button, EmptyState, Skeleton, buttonClass } from "@/components/workbench";
import { apiGet } from "@/lib/api/client";
import { videoFrameSrc } from "@/lib/video-frame";
import {
  ReferencePickerPopover,
  ReferenceTile,
  type ReferenceRowSummary,
} from "./collection-reference-picker-popover";

interface VideoReferencePickerProps {
  selectedFileId: string | null;
  onChange: (fileId: string | null) => void;
  disabled?: boolean;
  disabledMessage?: string;
  onSeedMissingChange?: (missing: boolean) => void;
}

export function VideoReferencePicker(props: VideoReferencePickerProps) {
  const { selectedFileId, onChange, disabled = false, onSeedMissingChange } = props;
  const { outputs, status, retry } = useRecentOutputs();
  const seed = useSeedFallback(selectedFileId, outputs, onSeedMissingChange);

  const selected = outputs.find((file) => file.id === selectedFileId) ?? null;
  const names = useMemo(() => outputNames(outputs), [outputs]);
  const summary = rowSummary({
    status,
    disabledMessage: disabled ? props.disabledMessage : undefined,
    selected,
    seed,
  });

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ReferencePickerPopover summary={summary} label="Video seed" disabled={disabled}>
        {(close) =>
          status.kind === "loading" ? (
            <div role="status" aria-label="Loading recent outputs…" className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2 p-1">
              {Array.from({ length: REFERENCE_LIMIT }, (_, index) => (
                <Skeleton key={index} shape="tile" className="aspect-[4/5]" />
              ))}
            </div>
          ) : status.kind === "error" ? (
            <EmptyState icon="alert" tone="error" title="Recent outputs could not be loaded" detail={status.message} className="min-h-0 py-6">
              <Button variant="strong" onClick={retry}>Retry</Button>
            </EmptyState>
          ) : outputs.length === 0 ? (
            <EmptyState icon="generate" title="Generate a video first, then continue it here" className="min-h-0 py-6">
              <Link href="/gallery" className={buttonClass("strong")}>Open gallery</Link>
            </EmptyState>
          ) : (
            <>
              <div className="flex min-h-8 items-center gap-2.5 pl-1">
                <span className="wb-label flex-1 text-fg-secondary">Recent outputs</span>
                {selectedFileId ? (
                  <Button variant="link" size={32} onClick={() => onChange(null)}>Clear</Button>
                ) : null}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2 p-1">
                {outputs.map((file, index) => {
                  const isSelected = selectedFileId === file.id;
                  return (
                    <ReferenceTile
                      key={file.id}
                      selected={isSelected}
                      label={`${isSelected ? "Remove" : "Use"} ${names[index]}`}
                      onToggle={() => {
                        onChange(isSelected ? null : file.id);
                        if (!isSelected) close();
                      }}
                    >
                      <OutputMedia file={file} />
                    </ReferenceTile>
                  );
                })}
              </div>
            </>
          )
        }
      </ReferencePickerPopover>
      {seed.kind === "missing" ? (
        <div role="alert" className="wb-notice" data-tone="bad">
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <strong>Seed unavailable.</strong> This output is no longer available. Clear the seed to continue.
          </span>
          <Button variant="link" size={32} onClick={() => onChange(null)}>Clear</Button>
        </div>
      ) : null}
    </div>
  );
}

const REFERENCE_LIMIT = 8;

interface ReferenceOutput {
  id: string;
  filename: string;
  type: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

type OutputFile = ReferenceOutput & { kind: "video" | "image" };
type LoadStatus = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };
type SeedState =
  | { kind: "none" }
  | { kind: "missing" }
  | { kind: "linked"; id: string; filename: string; fileKind: "video" | "image" };

/**
 * Output filenames are storage ids, so a tile is named by what it is and when it was made. Outputs of
 * one batch share a minute and are told apart by their place in it.
 */
function outputNames(outputs: OutputFile[]) {
  const base = outputs.map((file) => {
    const date = new Date(file.createdAt);
    if (Number.isNaN(date.getTime())) return file.kind;
    const when = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return `${file.kind} from ${when}`;
  });
  return base.map((name, index) => {
    const total = base.filter((other) => other === name).length;
    if (total === 1) return name;
    const place = base.slice(0, index).filter((other) => other === name).length + 1;
    return `${name}, ${place} of ${total}`;
  });
}

function OutputMedia({ file }: { file: OutputFile }) {
  if (file.kind === "image") {
    return (
      <FileImage src={`/api/files/${file.id}`} alt={file.filename} sizes="(max-width: 640px) 25vw, 120px" />
    );
  }
  return (
    <>
      <video src={videoFrameSrc(`/api/files/${file.id}`)} preload="metadata" muted playsInline aria-label={file.filename} />
      <span className="wb-tile-duration" aria-hidden="true">
        <Play className="size-2.5 fill-current" strokeWidth={0} />
      </span>
    </>
  );
}

function useRecentOutputs() {
  const [files, setFiles] = useState<{ videos: ReferenceOutput[]; images: ReferenceOutput[] }>({
    videos: [],
    images: [],
  });
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadRecentOutputs().then(
      (next) => {
        if (cancelled) return;
        setFiles(next);
        setStatus({ kind: "ready" });
      },
      (cause: unknown) => {
        if (cancelled) return;
        setStatus({
          kind: "error",
          message: cause instanceof Error ? cause.message : "Recent outputs could not be loaded.",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const outputs = useMemo(
    () =>
      [
        ...files.videos.map((file) => ({ ...file, kind: "video" as const })),
        ...files.images.map((file) => ({ ...file, kind: "image" as const })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, REFERENCE_LIMIT),
    [files],
  );

  return {
    outputs,
    status,
    retry: () => {
      setStatus({ kind: "loading" });
      setAttempt((value) => value + 1);
    },
  };
}

function useSeedFallback(
  selectedFileId: string | null,
  outputs: OutputFile[],
  onSeedMissingChange: ((missing: boolean) => void) | undefined,
) {
  const [seed, setSeed] = useState<SeedState>({ kind: "none" });

  const needsLookup =
    Boolean(selectedFileId) && !outputs.some((file) => file.id === selectedFileId);

  useEffect(() => {
    if (!selectedFileId || !needsLookup) {
      onSeedMissingChange?.(false);
      return;
    }
    let active = true;
    loadSeedMetadata(selectedFileId).then(
      (next) => {
        if (!active) return;
        setSeed(next);
        onSeedMissingChange?.(false);
      },
      () => {
        if (!active) return;
        setSeed({ kind: "missing" });
        onSeedMissingChange?.(true);
      },
    );
    return () => {
      active = false;
    };
  }, [selectedFileId, needsLookup, onSeedMissingChange]);

  return needsLookup ? seed : NO_SEED;
}

async function loadRecentOutputs() {
  const [videos, images] = await Promise.all([
    apiGet<ReferenceOutput[]>("/api/files?type=video&limit=8"),
    apiGet<ReferenceOutput[]>("/api/files?type=image&limit=8"),
  ]);
  return { videos, images };
}

async function loadSeedMetadata(fileId: string): Promise<SeedState> {
  const data = await apiGet<{ file: { id: string; filename: string; type: string } }>(
    `/api/files/${encodeURIComponent(fileId)}/metadata`,
  );
  return {
    kind: "linked",
    id: data.file.id,
    filename: asString(data.file.filename) ?? "Selected output",
    fileKind: data.file.type === "video" ? "video" : "image",
  };
}

function rowSummary({
  status,
  disabledMessage,
  selected,
  seed,
}: {
  status: LoadStatus;
  disabledMessage: string | undefined;
  selected: OutputFile | null;
  seed: SeedState;
}): ReferenceRowSummary {
  if (disabledMessage) return { text: disabledMessage, placeholder: true };
  if (status.kind === "loading") return { text: "Loading recent outputs…", placeholder: true };
  if (seed.kind === "missing") return { text: "Seed output unavailable", tone: "bad" };
  const chosen = selected
    ? { id: selected.id, filename: asString(selected.filename) ?? "Selected output", kind: selected.kind }
    : seed.kind === "linked"
      ? { id: seed.id, filename: seed.filename, kind: seed.fileKind }
      : null;
  if (!chosen) {
    return status.kind === "error"
      ? { text: "Recent outputs could not be loaded", tone: "bad" }
      : { text: "No seed chosen", placeholder: true };
  }
  return {
    text: chosen.filename,
    meta: selected ? undefined : "Linked",
    thumb:
      chosen.kind === "video" ? (
        <video src={videoFrameSrc(`/api/files/${chosen.id}`)} preload="metadata" muted playsInline aria-hidden="true" />
      ) : (
        <FileImage src={`/api/files/${chosen.id}`} alt="" sizes="32px" />
      ),
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

const NO_SEED: SeedState = { kind: "none" };
