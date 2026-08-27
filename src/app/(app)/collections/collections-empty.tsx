"use client";

import { Button } from "@/components/ui/button";
import { FolderOpen, Link2, Loader2, Upload } from "lucide-react";
import { CollectionsPanel } from "./collections-panel";
import type { CollectionsEmptyProps } from "./types";

export function CollectionsEmpty({
  uploading,
  onUpload,
  onPinterest,
}: CollectionsEmptyProps) {
  return (
    <CollectionsPanel className="pf-empty-stage flex min-h-[650px] flex-col items-center justify-start p-6 text-center">
      <div
        data-empty-icon="true"
        className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
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
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <div data-empty-actions="true">
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
        </div>
        <Button type="button" variant="outline" onClick={onPinterest}>
          <Link2 className="size-3.5" /> Import from Pinterest
        </Button>
      </div>
      <small data-empty-note="true" className="mt-3 text-[12px] text-muted-foreground">
        JPG, PNG, WEBP · up to 25 MB each
      </small>
    </CollectionsPanel>
  );
}
