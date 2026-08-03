"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SlideshowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-6 py-16">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Slideshow studio could not load</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {error.message || "PostForge could not load the slideshow workspace."}
        </p>
        <Button onClick={reset} className="mt-6 gap-2 bg-accent-coral text-white hover:bg-[#ff6540]">
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
