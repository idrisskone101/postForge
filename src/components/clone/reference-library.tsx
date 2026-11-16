import type { ReactNode } from "react";
import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { Button, CountBadge, Icon, StatusBadge } from "@/components/workbench";
import { useCloneReference } from "@/components/clone/clone-reference-provider";
import { cn } from "@/lib/utils";

export function CloneReferenceLibrary() {
  const {
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
    onCollectionChange,
    onSelectGenerated,
    onToggleLibrary,
    onSelectSavedReference,
    onLoadMore,
    onToggleAvatarReferences,
  } = useCloneReference();
  const generatedSelected = !selectedCollectionAssetId && !selectedSavedReference;

  return (
    <>
      {refImages.length > 0 && (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="wb-label">
            This run{" "}
            <span className="ml-1 font-normal text-fg-secondary">
              {generatedSelected ? selectedRefIndex + 1 : 0} / {refImages.length}
            </span>
          </p>
          <div className="-m-1 flex gap-2.5 overflow-x-auto p-1">
            {refImages.map((entry, index) => (
              <button
                key={entry.jobId}
                type="button"
                onClick={() => onSelectGenerated(index)}
                aria-pressed={generatedSelected && selectedRefIndex === index}
                aria-label={`Generated reference variant ${index + 1}, ${entry.status}`}
                className={cn(THUMB, "w-[84px] shrink-0")}
              >
                {entry.status === "completed" && entry.fileId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${entry.fileId}`} alt="" className="size-full object-cover" />
                ) : entry.status === "generating" ? (
                  <span className="grid size-full place-items-center bg-raised">
                    <span className="wb-live-dot" />
                  </span>
                ) : (
                  <span className="grid size-full place-items-center bg-raised">
                    <StatusBadge tone="bad" label="Failed" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <p className="wb-label">Visual collections</p>
        <CollectionReferencePicker
          selectedAssetIds={selectedCollectionAssetId ? [selectedCollectionAssetId] : []}
          onChange={onCollectionChange}
          maxSelection={1}
        />
      </div>

      {savedReferencesError && (
        <p role="alert" className="wb-notice min-w-0 [overflow-wrap:anywhere]" data-tone="bad">
          <span className="min-w-0">
            <strong className="font-semibold text-bad">Saved references did not load.</strong>{" "}
            {savedReferencesError}
          </span>
        </p>
      )}

      <div className="flex min-w-0 flex-col">
        {(savedReferences.length > 0 || isLoadingSavedReferences) && (
          <Disclosure
            title="Reference library"
            count={savedReferences.length}
            open={referenceLibraryOpen}
            controls="reference-library-grid"
            onToggle={onToggleLibrary}
            disabled={savedReferences.length === 0}
          >
            <div
              id="reference-library-grid"
              data-reference-thumbnail-grid="true"
              className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2.5 p-1 pb-4"
            >
              {savedReferences.map((reference) => (
                <button
                  key={reference.id}
                  type="button"
                  onClick={() => onSelectSavedReference(reference.id)}
                  aria-pressed={reference.id === selectedSavedReferenceId}
                  aria-label="Saved reference"
                  className={THUMB}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={reference.previewUrl} alt="" className="size-full object-cover" />
                  {reference.id === selectedSavedReferenceId && <ChosenCheck />}
                </button>
              ))}
              {savedReferencesNextCursor && (
                <div className="col-span-full flex justify-center pt-1">
                  <Button size={32} onClick={onLoadMore} disabled={isLoadingMoreSavedReferences}>
                    {isLoadingMoreSavedReferences ? "Loading" : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          </Disclosure>
        )}

        <Disclosure
          title="Identity references"
          count={avatarReferencePreviews.length}
          open={showAvatarReferences && avatarReferencePreviews.length > 0}
          controls="identity-reference-grid"
          onToggle={onToggleAvatarReferences}
          disabled={avatarReferencePreviews.length === 0}
        >
          <div className="wb-ring-host rounded-lg has-[>:focus-visible]:-outline-offset-2">
            <div
              id="identity-reference-grid"
              data-avatar-reference-inspector="true"
              className="wb-scroll-fade-y wb-scroll-fade-deep grid max-h-80 grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2.5 overflow-y-auto p-1 pb-4"
            >
              {avatarReferencePreviews.map((reference) => (
                <figure key={reference.id} className="flex min-w-0 flex-col gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reference.previewUrl}
                    alt={reference.label}
                    title={`${reference.label} · ${reference.detail}`}
                    className="aspect-[9/16] w-full rounded-lg bg-media object-cover"
                  />
                  <figcaption className="truncate text-[12px] leading-4 text-fg-secondary">
                    {reference.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Disclosure>
      </div>
    </>
  );
}

const THUMB =
  "relative aspect-[9/16] overflow-hidden rounded-lg bg-media transition-shadow duration-[160ms] ease-pf aria-pressed:shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]";

function ChosenCheck() {
  return (
    <span className="absolute left-1.5 top-1.5 grid size-[22px] place-items-center rounded-full bg-ember text-[var(--pf-on-ember)]">
      <Icon name="check" size={12} strokeWidth={3} />
    </span>
  );
}

function Disclosure({
  title,
  count,
  open,
  controls,
  onToggle,
  disabled,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  controls: string;
  onToggle: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-hairline">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={controls}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-sm text-left disabled:cursor-not-allowed disabled:text-fg-disabled"
      >
        <span className="flex items-center gap-2 text-[14px] font-semibold leading-[18px]">
          {title}
          <CountBadge count={count} />
        </span>
        <Icon
          name="chevron-down"
          size={16}
          className={cn(
            "text-fg-secondary transition-transform duration-[200ms] ease-pf",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? children : null}
    </div>
  );
}
