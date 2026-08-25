"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { CharacterAttributeEditorViewModel } from "./character-attribute-editor";

function CharacterAttributeEditorSkeleton() {
  return (
    <section
      aria-hidden="true"
      data-character-attribute-editor="true"
      className="min-w-0 bg-white min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0"
    />
  );
}

const CharacterAttributeEditorDynamic = dynamic(
  () =>
    import("./character-attribute-editor").then((mod) => ({
      default: mod.CharacterAttributeEditor,
    })),
  { ssr: false, loading: CharacterAttributeEditorSkeleton },
);

export function CharacterAttributeEditorLazy({
  view,
}: {
  view: CharacterAttributeEditorViewModel;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.readyState === "complete") {
      setReady(true);
      return;
    }
    const onLoad = () => setReady(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  if (!ready) return <CharacterAttributeEditorSkeleton />;
  return <CharacterAttributeEditorDynamic view={view} />;
}
