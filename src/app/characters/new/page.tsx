import { Suspense } from "react";
import { CharacterBuilderClient } from "./character-builder-client";

export default function CharacterBuilderPage() {
  return (
    <Suspense fallback={<div className="pf-content-viewport animate-pulse bg-[#F3F4EF]" />}>
      <CharacterBuilderClient />
    </Suspense>
  );
}
