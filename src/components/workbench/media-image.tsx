"use client";

/* eslint-disable @next/next/no-img-element -- the shared element for stored media served by the app's own routes */
import { useCallback, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * An `<img>` that follows the loading motion: invisible over its media-coloured box until it has
 * loaded, then a 200ms cross-fade. The box and its size belong to the parent.
 */
export function MediaImage({ className, onLoad, onError, ...rest }: Omit<ComponentProps<"img">, "ref">) {
  const reveal = useMediaReveal();
  return (
    <img
      {...rest}
      {...reveal.props}
      className={cn(MEDIA_REVEAL_CLASS, className)}
      onLoad={(event) => {
        reveal.markLoaded();
        onLoad?.(event);
      }}
      onError={(event) => {
        // A failed image has nothing to fade in; show the alt text or the caller's fallback at once.
        reveal.markLoaded();
        onError?.(event);
      }}
    />
  );
}

/** Styled in `workbench-data.css`. Pair it with the props from `useMediaReveal`. */
export const MEDIA_REVEAL_CLASS = "wb-media-reveal";

/** `shown`: the CSS fallback already revealed the element before React attached, so it must not fade again. */
type RevealPhase = "server" | "pending" | "loaded" | "shown";

const LOADED_ATTRIBUTE: Record<RevealPhase, string | undefined> = {
  server: undefined,
  pending: "false",
  loaded: "true",
  shown: "shown",
};

/**
 * Loading state for one media element that is not a plain `<img>` (`next/image`, `<video>`).
 * Spread `props` on the element, add `MEDIA_REVEAL_CLASS`, and call `markLoaded` from its load event.
 * Until React attaches the ref the element carries no `data-loaded`, which is what arms the CSS
 * fallback that shows media when scripts are slow or never run.
 */
export function useMediaReveal() {
  const [phase, setPhase] = useState<RevealPhase>("server");
  const ref = useCallback((node: HTMLImageElement | HTMLVideoElement | null) => {
    if (!node) return;
    const ready = hasFrame(node);
    const revealed = ready && window.getComputedStyle(node).opacity !== "0";
    // `next/image` hands the node over again on later renders; only the first hand-over decides.
    setPhase((current) => {
      if (current !== "server") return current;
      if (!ready) return "pending";
      return revealed ? "shown" : "loaded";
    });
  }, []);
  const markLoaded = useCallback(
    () => setPhase((current) => (current === "shown" ? current : "loaded")),
    [],
  );
  return {
    loaded: phase === "loaded" || phase === "shown",
    markLoaded,
    props: { ref, "data-loaded": LOADED_ATTRIBUTE[phase] },
  };
}

function hasFrame(node: HTMLImageElement | HTMLVideoElement) {
  return node instanceof HTMLImageElement ? node.complete && node.naturalWidth > 0 : node.readyState >= 2;
}
