"use client";

import { Skeleton, Toast } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { useMountedInBrowser } from "@/lib/use-hydrated";
import { CharacterAttributeEditor } from "./character-attribute-editor";
import { CharacterBuilderHeader } from "./character-builder-header";
import { CharacterCategoryRail } from "./character-category-rail";
import { CharacterImportDialog } from "./character-import-dialog";
import { CharacterPreviewStage } from "./character-preview-stage";
import { useCharacterBuilder } from "./use-character-builder";

export function CharacterBuilderClient({ editId = null }: { editId?: string | null }) {
  const {
    loading,
    attributes,
    activeSection,
    setActiveSection,
    headerView,
    previewView,
    attributeView,
    importOpen,
    setImportOpen,
    importValue,
    setImportValue,
    applyImport,
    importError,
    toast,
    dismissToast,
  } = useCharacterBuilder(editId);
  const mountedInBrowser = useMountedInBrowser();

  return (
    <>
      <CharacterBuilderHeader view={headerView} />
      {loading ? (
        <CharacterBuilderSkeleton />
      ) : (
        <div
          data-character-workbench
          className={cn(
            // Server markup paints at once; the fade is for the skeleton swap and client navigation.
            (mountedInBrowser || editId) && "wb-fade-in",
            "flex min-w-0 flex-col gap-3 xl:h-[calc(100dvh-100px)] xl:min-h-[640px] xl:flex-row",
          )}
        >
          <CharacterCategoryRail
            attributes={attributes}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row xl:min-h-0 xl:flex-1">
            <CharacterAttributeEditor view={attributeView} />
            <CharacterPreviewStage view={previewView} />
          </div>
        </div>
      )}
      <CharacterImportDialog
        open={importOpen}
        value={importValue}
        error={importError}
        actions={{ onOpenChange: setImportOpen, onValueChange: setImportValue, onApply: applyImport }}
      />
      <div className="wb-toast-region">
        {toast ? <Toast key={toast.id} toast={toast} onDismiss={dismissToast} /> : null}
      </div>
    </>
  );
}

function CharacterBuilderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading character" className="flex min-w-0 flex-col gap-3 xl:h-[calc(100dvh-100px)] xl:min-h-[640px] xl:flex-row">
      <Skeleton shape="panel" className="h-12 xl:h-auto xl:w-[272px]" />
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row xl:flex-1">
        <Skeleton shape="panel" className="h-[420px] lg:h-auto lg:flex-1" />
        <Skeleton shape="panel" className="h-[520px] lg:w-[344px]" />
      </div>
    </div>
  );
}
