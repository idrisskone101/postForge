import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import type {
  AvatarIdentityPack,
  AvatarReferencePreview,
  RefImageEntry,
  SavedReference,
} from "@/components/clone/types";

export function CloneReferenceLibrary({
  selectedCollectionAssetId,
  selectedSavedReference,
  selectedSavedReferenceId,
  selectedRefIndex,
  refImages,
  isLoadingSavedReferences,
  savedReferencesError,
  savedReferences,
  savedReferencesNextCursor,
  isLoadingMoreSavedReferences,
  referenceLibraryOpen,
  showAvatarReferences,
  avatarReferencePreviews,
  identityPack,
  isStartingIdentityPack,
  onCollectionChange,
  onSelectGenerated,
  onToggleLibrary,
  onSelectSavedReference,
  onLoadMore,
  onToggleAvatarReferences,
}: {
  selectedCollectionAssetId: string | null;
  selectedSavedReference: SavedReference | null;
  selectedSavedReferenceId: string | null;
  selectedRefIndex: number;
  refImages: RefImageEntry[];
  isLoadingSavedReferences: boolean;
  savedReferencesError: string | null;
  savedReferences: SavedReference[];
  savedReferencesNextCursor: string | null;
  isLoadingMoreSavedReferences: boolean;
  referenceLibraryOpen: boolean;
  showAvatarReferences: boolean;
  avatarReferencePreviews: AvatarReferencePreview[];
  identityPack: AvatarIdentityPack | null;
  isStartingIdentityPack: boolean;
  onCollectionChange: (assetIds: string[]) => void;
  onSelectGenerated: (index: number) => void;
  onToggleLibrary: () => void;
  onSelectSavedReference: (referenceId: string) => void;
  onLoadMore: () => void;
  onToggleAvatarReferences: () => void;
}) {
  return (
    <>
      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
        <div>
          <p className="text-xs font-semibold text-foreground">Visual collections</p>
          <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
            Use one owned collection image directly, or keep generating a new reference below.
          </p>
        </div>
        <CollectionReferencePicker
          selectedAssetIds={
            selectedCollectionAssetId ? [selectedCollectionAssetId] : []
          }
          onChange={onCollectionChange}
          maxSelection={1}
        />
      </div>

      {refImages.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-foreground">This run</p>
            <span className="font-mono text-[12px] text-muted-foreground/80">
              {refImages.length} generated
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {refImages.map((entry, index) => (
              <button
                key={entry.jobId}
                type="button"
                onClick={() => onSelectGenerated(index)}
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
                  <span className="grid size-full place-items-center bg-destructive/10 text-[12px] font-semibold uppercase text-destructive">
                    Failed
                  </span>
                )}
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[12px] font-bold text-white">
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
        <div className="rounded-lg border border-border bg-muted/40">
          <button
            type="button"
            onClick={onToggleLibrary}
            aria-expanded={referenceLibraryOpen}
            aria-controls="reference-library-grid"
            className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/40 sm:p-4"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Reference library</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Browse a saved look only when you need one.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-[12px] text-muted-foreground/80">
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
              {savedReferences.map((reference) => (
                <button
                  key={reference.id}
                  type="button"
                  onClick={() => onSelectSavedReference(reference.id)}
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
          {referenceLibraryOpen && savedReferencesNextCursor && (
            <div className="flex flex-col gap-2 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMoreSavedReferences}
                className="h-8 rounded-lg border border-border bg-muted/50 px-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMoreSavedReferences ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          onClick={onToggleAvatarReferences}
          disabled={avatarReferencePreviews.length === 0}
          aria-expanded={showAvatarReferences}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="min-w-0">
            <span className="block text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
              Identity references
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground/70">
              {avatarReferencePreviews.length > 0
                ? `${avatarReferencePreviews.length} available to inspect`
                : "Choose an identity to view references"}
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
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
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[12px] font-medium text-white">
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
    </>
  );
}
