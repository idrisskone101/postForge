"use client";

import { SpendLoadError } from "./spend-load-error";

export default function CostsError({ reset }: { reset: () => void }) {
  return <SpendLoadError onRetry={reset} />;
}
