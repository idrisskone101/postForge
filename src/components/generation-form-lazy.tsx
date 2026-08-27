"use client";

import { GenerationForm } from "@/components/generation-form";
import type { GenerationFormProps } from "@/app/(app)/generate/form-types";

export function GenerationFormLazy(props: GenerationFormProps) {
  return <GenerationForm {...props} />;
}
