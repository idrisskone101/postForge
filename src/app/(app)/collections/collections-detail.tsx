"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { assetUrl, formatImageCount } from "./collections-helpers";
import type { CollectionsDetailModel } from "./types";

export function CollectionsDetail({ detail }: { detail: CollectionsDetailModel }) {
  const { collection, assets, onClose, onAddImages, onDelete, onToggleAsset } = detail;

  return (
    <div className="fixed inset-0 z-[70] bg-black/35" onClick={onClose}>
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col bg-background shadow-[var(--pf-shadow-lg)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-24 min-w-0 items-center justify-between gap-3 border-b border-border bg-card px-5 pt-[env(safe-area-inset-top)]">
          <div className="min-w-0">
            <h2 className="break-words text-[20px] font-semibold tracking-[-0.02em] text-foreground">
              {collection.name}
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {formatImageCount(collection.assetIds.length)} · database-backed
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close collection"
          >
            <X className="size-3.5" />
          </Button>
        </header>
        <div className="flex flex-col gap-2 p-3 min-[420px]:flex-row">
          <button type="button" onClick={onAddImages} className="pf-button-primary flex-1">
            <Plus className="size-3.5" /> Add new images
          </button>
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="text-[12px] font-medium text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
        <div className="grid flex-1 auto-rows-[150px] grid-cols-2 gap-2 overflow-y-auto px-3 pb-4 min-[420px]:grid-cols-3">
          {assets.map((asset) => {
            const included = collection.assetIds.includes(asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onToggleAsset(asset.id)}
                className={cn(
                  "relative overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-[180ms] ease-[var(--pf-ease)]",
                  included
                    ? "border-primary ring-1 ring-primary/25"
                    : "border-border opacity-55 hover:opacity-100"
                )}
              >
                <Image
                  src={assetUrl(asset.id)}
                  alt={asset.name}
                  fill
                  sizes="140px"
                  className="object-cover"
                  unoptimized
                />
                {included ? (
                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <footer className="border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-[11px] leading-4 text-muted-foreground">
          Select any image to add or remove it. Removing an image from a collection does not
          delete the original asset.
        </footer>
      </aside>
    </div>
  );
}
