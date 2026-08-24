import { Suspense } from "react";
import { CharacterBuilderClient } from "./character-builder-client";

export default function CharacterBuilderPage() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/character-builder/default-portrait.webp"
        fetchPriority="high"
      />
      <Suspense fallback={<div className="pf-content-viewport animate-pulse bg-[var(--pf-canvas)]" />}>
        <CharacterBuilderClient />
      </Suspense>
    </>
  );
}
