import { cn } from "@/lib/utils";
import type { TikTokVideoInfo } from "@/components/tiktok-input";
import { CloneReferenceInputs } from "@/components/clone/reference-inputs";
import { CloneReferenceLibrary } from "@/components/clone/reference-library";
import { CloneReferenceOptions } from "@/components/clone/reference-options";
import type { ReferenceBatchSize } from "@/components/clone/constants";
import type {
  AvatarIdentityPack,
  AvatarReferencePreview,
  RefImageEntry,
  SavedReference,
} from "@/components/clone/types";

export function CloneReferenceStep({
  hidden,
  sourceReady,
  videoInfo,
  sourcePreviewSrc,
  durationSec,
  selectedCollectionAssetId,
  selectedSavedReference,
  selectedSavedReferenceId,
  selectedRef,
  selectedRefIndex,
  primaryAvatarReference,
  identityPack,
  isStartingIdentityPack,
  hairstyleOptions,
  selectedHairstyleRole,
  referenceBatchSize,
  referenceBatchCost,
  isSubmitting,
  isGenerating,
  referenceReady,
  submitError,
  refImages,
  isLoadingSavedReferences,
  savedReferencesError,
  savedReferences,
  savedReferencesNextCursor,
  isLoadingMoreSavedReferences,
  referenceLibraryOpen,
  showAvatarReferences,
  avatarReferencePreviews,
  onClearCollection,
  onClearSavedReference,
  onSelectHairstyleRole,
  onSelectBatchSize,
  onCollectionChange,
  onSelectGenerated,
  onToggleLibrary,
  onSelectSavedReference,
  onLoadMore,
  onToggleAvatarReferences,
}: {
  hidden: boolean;
  sourceReady: boolean;
  videoInfo: TikTokVideoInfo | null;
  sourcePreviewSrc: string | null;
  durationSec: number;
  selectedCollectionAssetId: string | null;
  selectedSavedReference: SavedReference | null;
  selectedSavedReferenceId: string | null;
  selectedRef: RefImageEntry | null;
  selectedRefIndex: number;
  primaryAvatarReference: AvatarReferencePreview | null;
  identityPack: AvatarIdentityPack | null;
  isStartingIdentityPack: boolean;
  hairstyleOptions: AvatarIdentityPack["images"];
  selectedHairstyleRole: string | null;
  referenceBatchSize: ReferenceBatchSize;
  referenceBatchCost: number;
  isSubmitting: boolean;
  isGenerating: boolean;
  referenceReady: boolean;
  submitError: string | null;
  refImages: RefImageEntry[];
  isLoadingSavedReferences: boolean;
  savedReferencesError: string | null;
  savedReferences: SavedReference[];
  savedReferencesNextCursor: string | null;
  isLoadingMoreSavedReferences: boolean;
  referenceLibraryOpen: boolean;
  showAvatarReferences: boolean;
  avatarReferencePreviews: AvatarReferencePreview[];
  onClearCollection: () => void;
  onClearSavedReference: () => void;
  onSelectHairstyleRole: (role: string | null) => void;
  onSelectBatchSize: (size: ReferenceBatchSize) => void;
  onCollectionChange: (assetIds: string[]) => void;
  onSelectGenerated: (index: number) => void;
  onToggleLibrary: () => void;
  onSelectSavedReference: (referenceId: string) => void;
  onLoadMore: () => void;
  onToggleAvatarReferences: () => void;
}) {
  return (
    <section
      data-clone-reference-section="true"
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5",
        hidden && "hidden"
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Reference
          </h2>
          <p className="text-xs text-muted-foreground">Set the look before generating video.</p>
        </div>
      </div>

      <div className="grid items-start gap-4">
        <CloneReferenceInputs
          sourceReady={sourceReady}
          videoInfo={videoInfo}
          sourcePreviewSrc={sourcePreviewSrc}
          durationSec={durationSec}
          selectedCollectionAssetId={selectedCollectionAssetId}
          selectedSavedReference={selectedSavedReference}
          selectedRef={selectedRef}
          selectedRefIndex={selectedRefIndex}
          primaryAvatarReference={primaryAvatarReference}
          identityPack={identityPack}
          isStartingIdentityPack={isStartingIdentityPack}
          onClearCollection={onClearCollection}
          onClearSavedReference={onClearSavedReference}
        />
        <CloneReferenceOptions
          hairstyleOptions={hairstyleOptions}
          selectedHairstyleRole={selectedHairstyleRole}
          referenceBatchSize={referenceBatchSize}
          referenceBatchCost={referenceBatchCost}
          isSubmitting={isSubmitting}
          isGenerating={isGenerating}
          referenceReady={referenceReady}
          submitError={submitError}
          onSelectHairstyleRole={onSelectHairstyleRole}
          onSelectBatchSize={onSelectBatchSize}
        />
        <CloneReferenceLibrary
          selectedCollectionAssetId={selectedCollectionAssetId}
          selectedSavedReference={selectedSavedReference}
          selectedSavedReferenceId={selectedSavedReferenceId}
          selectedRefIndex={selectedRefIndex}
          refImages={refImages}
          isLoadingSavedReferences={isLoadingSavedReferences}
          savedReferencesError={savedReferencesError}
          savedReferences={savedReferences}
          savedReferencesNextCursor={savedReferencesNextCursor}
          isLoadingMoreSavedReferences={isLoadingMoreSavedReferences}
          referenceLibraryOpen={referenceLibraryOpen}
          showAvatarReferences={showAvatarReferences}
          avatarReferencePreviews={avatarReferencePreviews}
          identityPack={identityPack}
          isStartingIdentityPack={isStartingIdentityPack}
          onCollectionChange={onCollectionChange}
          onSelectGenerated={onSelectGenerated}
          onToggleLibrary={onToggleLibrary}
          onSelectSavedReference={onSelectSavedReference}
          onLoadMore={onLoadMore}
          onToggleAvatarReferences={onToggleAvatarReferences}
        />
      </div>
    </section>
  );
}
