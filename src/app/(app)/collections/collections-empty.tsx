"use client";

import { FolderOpen, Link2, Loader2, Upload } from "lucide-react";
import type { CollectionsEmptyProps } from "./types";

export function CollectionsEmpty({
  uploading,
  onUpload,
  onPinterest,
}: CollectionsEmptyProps) {
  return (
    <section className="pf-card pf-empty-stage flex min-h-[650px] flex-col items-center justify-start p-6 text-center">
      <div
        data-empty-icon="true"
        className="grid size-14 place-items-center rounded-2xl bg-[var(--pf-active)] text-[var(--pf-muted)]"
      >
        <FolderOpen className="size-7" />
      </div>
      <h2
        data-empty-heading="true"
        data-empty-title="Your reusable image library lives here"
      >
        <span className="sr-only">Your reusable image library lives here</span>
      </h2>
      <p className="sr-only">
        Upload owned product shots, portraits, locations, and textures. Group them into
        collections that other PostForge workflows can reuse.
      </p>
      <p
        aria-hidden="true"
        data-empty-copy="Upload owned product shots, portraits, locations, and textures. Group them into collections that other PostForge workflows can reuse."
      />
      <div
        data-empty-actions="true"
        className="mt-5 flex flex-wrap items-center justify-center gap-2"
      >
        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          className="pf-button-primary"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          Upload your first images
        </button>
        <button type="button" onClick={onPinterest} className="pf-button-secondary">
          <Link2 className="size-3.5" /> Import from Pinterest
        </button>
      </div>
      <small data-empty-note="true" className="mt-3 text-[12px] text-[var(--pf-muted)]">
        JPG, PNG, WEBP · up to 25 MB each
      </small>
    </section>
  );
}
