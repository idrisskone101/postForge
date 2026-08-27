"use client";

import dynamic from "next/dynamic";
import { GenerateFormSkeleton } from "@/app/(app)/generate/generate-form-skeleton";
import type { GenerationFormProps } from "@/app/(app)/generate/form-types";

export function GenerationFormLazy(props: GenerationFormProps) {
  return <GenerationFormDynamic {...props} />;
}

const GenerationFormDynamic = dynamic(
  () =>
    import("@/components/generation-form").then((mod) => ({
      default: mod.GenerationForm,
    })),
  { ssr: false, loading: GenerateFormSkeleton },
);
