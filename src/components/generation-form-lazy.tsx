"use client";

import dynamic from "next/dynamic";
import { GenerateFormSkeleton } from "@/app/(app)/generate/generate-form-skeleton";

export const GenerationFormLazy = dynamic(
  () =>
    import("@/components/generation-form").then((mod) => ({
      default: mod.GenerationForm,
    })),
  { ssr: false, loading: GenerateFormSkeleton },
);
