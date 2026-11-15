"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { Toast } from "@/components/workbench/toast";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { InspirationCreatorRail } from "./inspiration-creator-rail";
import { InspirationHeaderControls } from "./inspiration-header-controls";
import { InspirationSourceLibrary } from "./inspiration-source-library";
import { useInspirationWorkspace } from "./use-inspiration-workspace";
import type { InspirationPageClientProps } from "./types";

export function InspirationPageClient(props: InspirationPageClientProps) {
  const workspace = useInspirationWorkspace(props);
  const {
    handleInput,
    setHandleInput,
    isAddingAccount,
    handleTrackAccount,
    pageError,
    setPageError,
    accounts,
    videoItems,
    isLoadingVideos,
  } = workspace;
  const loadFailed =
    pageError !== null && accounts.length > 0 && videoItems.length === 0 && !isLoadingVideos;
  const dismissError = useCallback(() => setPageError(null), [setPageError]);

  return (
    <>
      <WorkspaceHeaderAccessory>
        <InspirationHeaderControls
          handleInput={handleInput}
          isAddingAccount={isAddingAccount}
          onHandleInputChange={setHandleInput}
          onTrackAccount={() => void handleTrackAccount()}
        />
      </WorkspaceHeaderAccessory>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch">
        <InspirationCreatorRail workspace={workspace} />
        <InspirationSourceLibrary workspace={workspace} loadFailed={loadFailed} />
      </div>

      {workspace.confirmDialog}

      {pageError && !loadFailed ? (
        <div className="wb-toast-region">
          <Toast
            key={pageError}
            toast={{ id: pageError, tone: "bad", message: pageError }}
            onDismiss={dismissError}
          />
        </div>
      ) : null}

      <InspirationPreviewDialog workspace={workspace} />
    </>
  );
}

const InspirationPreviewDialog = dynamic(
  () =>
    import("./inspiration-preview-dialog").then(
      (module) => module.InspirationPreviewDialog
    ),
  { ssr: false }
);
