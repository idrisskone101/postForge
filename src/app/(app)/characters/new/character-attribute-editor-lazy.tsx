"use client";

import { useEffect, useState } from "react";
import type { CharacterAttributeEditorViewModel } from "./character-attribute-editor";
import { CharacterAttributeEditorDynamic } from "./character-attribute-editor-dynamic";

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
    function onLoad() {
      setReady(true);
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  if (!ready) {
    return (
      <div
        data-character-attribute-editor="true"
        className="min-h-[470px] min-w-0 bg-white min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0"
        aria-hidden="true"
      />
    );
  }
  return <CharacterAttributeEditorDynamic view={view} />;
}
