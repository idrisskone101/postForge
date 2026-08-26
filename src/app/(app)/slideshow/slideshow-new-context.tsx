"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { SlideshowNewContextValue } from "./types";

export function SlideshowNewProvider({ children }: { children: ReactNode }) {
  const [templateOpen, setTemplateOpen] = useState(false);
  return (
    <SlideshowNewContext.Provider
      value={{
        templateOpen,
        setTemplateOpen,
        openTemplateDialog: () => setTemplateOpen(true),
      }}
    >
      {children}
    </SlideshowNewContext.Provider>
  );
}

export function useSlideshowNew() {
  const value = useContext(SlideshowNewContext);
  if (!value) {
    throw new Error("useSlideshowNew must be used within SlideshowNewProvider");
  }
  return value;
}

const SlideshowNewContext = createContext<SlideshowNewContextValue | null>(null);
