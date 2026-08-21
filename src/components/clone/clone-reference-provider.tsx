"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CloneReferenceWorkspace } from "@/components/clone/view-models";

export function CloneReferenceProvider({
  workspace,
  children,
}: {
  workspace: CloneReferenceWorkspace;
  children: ReactNode;
}) {
  return (
    <CloneReferenceContext.Provider value={workspace}>
      {children}
    </CloneReferenceContext.Provider>
  );
}

const CloneReferenceContext = createContext<CloneReferenceWorkspace | null>(null);

export function useCloneReference(): CloneReferenceWorkspace {
  const workspace = useContext(CloneReferenceContext);
  if (!workspace) {
    throw new Error(
      "useCloneReference must be used within CloneReferenceProvider",
    );
  }
  return workspace;
}
