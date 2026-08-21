"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SlideshowEditorWorkspace } from "./view-models";

export function SlideshowEditorProvider({
  workspace,
  children,
}: {
  workspace: SlideshowEditorWorkspace;
  children: ReactNode;
}) {
  return (
    <SlideshowEditorContext.Provider value={workspace}>
      {children}
    </SlideshowEditorContext.Provider>
  );
}

const SlideshowEditorContext = createContext<SlideshowEditorWorkspace | null>(
  null,
);

export function useSlideshowEditor(): SlideshowEditorWorkspace {
  const workspace = useContext(SlideshowEditorContext);
  if (!workspace) {
    throw new Error(
      "useSlideshowEditor must be used within SlideshowEditorProvider",
    );
  }
  return workspace;
}
