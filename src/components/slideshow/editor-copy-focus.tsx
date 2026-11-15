"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SlideshowOverlayLayer } from "@/lib/slideshow/text-overlay";

type CopyFocusHandlers = { onFocus: () => void; onBlur: () => void };

// Which copy field of the inspector has focus, so the stage can frame its block on the canvas.
export function EditorCopyFocusProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<SlideshowOverlayLayer | null>(null);
  return (
    <CopyFocusSetContext.Provider value={setLayer}>
      <CopyFocusLayerContext.Provider value={layer}>
        {children}
      </CopyFocusLayerContext.Provider>
    </CopyFocusSetContext.Provider>
  );
}

export function useCopyFocusLayer() {
  return useContext(CopyFocusLayerContext);
}

export function useCopyFocusHandlers(
  layer: SlideshowOverlayLayer,
): CopyFocusHandlers | undefined {
  const setLayer = useContext(CopyFocusSetContext);
  return useMemo(
    () =>
      setLayer
        ? { onFocus: () => setLayer(layer), onBlur: () => setLayer(null) }
        : undefined,
    [layer, setLayer],
  );
}

const CopyFocusLayerContext = createContext<SlideshowOverlayLayer | null>(null);
const CopyFocusSetContext = createContext<
  ((layer: SlideshowOverlayLayer | null) => void) | null
>(null);
