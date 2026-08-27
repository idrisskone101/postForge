"use client";

import dynamic from "next/dynamic";
import { GenerateFormSkeleton } from "@/app/(app)/generate/generate-form-skeleton";
import type { GenerationFormProps } from "@/app/(app)/generate/form-types";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";

export function GenerationFormLazy(props: GenerationFormProps) {
  const ready = useWindowLoadReady();
  if (!ready) return <GenerateFormSkeleton />;
  return <GenerationFormDynamic {...props} />;
}

function loadGenerationForm() {
  return import("@/components/generation-form");
}

const GenerationFormDynamic = dynamic(
  () =>
    loadGenerationForm().then((mod) => ({
      default: mod.GenerationForm,
    })),
  { ssr: false, loading: GenerateFormSkeleton },
);

void loadGenerationForm();
