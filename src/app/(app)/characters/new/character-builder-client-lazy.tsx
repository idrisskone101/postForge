"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

export function CharacterBuilderClientLazy({
  editId = null,
}: {
  editId?: string | null;
}) {
  const needsSession = Boolean(editId);
  const [ready, setReady] = useState(needsSession);
  useEffect(() => {
    if (needsSession) return;
    const go = () => setReady(true);
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
  }, [needsSession]);
  useEffect(() => {
    if (!ready) return;
    document
      .querySelector("[data-character-first-paint]")
      ?.setAttribute("hidden", "");
  }, [ready]);
  if (!ready) return null;
  return <CharacterBuilderClientDynamic editId={editId} />;
}

const CharacterBuilderClientDynamic = dynamic(
  () =>
    import("./character-builder-client").then((mod) => ({
      default: mod.CharacterBuilderClient,
    })),
  { ssr: false },
);
