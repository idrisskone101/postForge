"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { StudioHomeView } from "./view-models";

export function SlideshowHomeProvider({
  home,
  children,
}: {
  home: StudioHomeView;
  children: ReactNode;
}) {
  return (
    <SlideshowHomeContext.Provider value={home}>
      {children}
    </SlideshowHomeContext.Provider>
  );
}

const SlideshowHomeContext = createContext<StudioHomeView | null>(null);

export function useSlideshowHome(): StudioHomeView {
  const home = useContext(SlideshowHomeContext);
  if (!home) {
    throw new Error("useSlideshowHome must be used within SlideshowHomeProvider");
  }
  return home;
}
