"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { GenerateFormSkeleton } from "@/app/(app)/generate/generate-form-skeleton";
import type { GenerationFormProps } from "@/app/(app)/generate/form-types";

const GenerationFormDynamic = dynamic(
  () =>
    import("@/components/generation-form").then((mod) => ({
      default: mod.GenerationForm,
    })),
  { ssr: false, loading: GenerateFormSkeleton },
);

export function GenerationFormLazy(props: GenerationFormProps) {
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
  if (!ready) return <GenerateFormSkeleton />;
  return <GenerationFormDynamic {...props} />;
}
