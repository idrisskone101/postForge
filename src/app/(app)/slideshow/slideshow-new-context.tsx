"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

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

type SlideshowNewContextValue = {
  templateOpen: boolean;
  setTemplateOpen: (open: boolean) => void;
  openTemplateDialog: () => void;
};

const SlideshowNewContext = createContext<SlideshowNewContextValue | null>(null);
