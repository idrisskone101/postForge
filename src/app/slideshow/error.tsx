"use client";

import { AlertCircle } from "lucide-react";

import { WorkspaceState } from "@/components/workspace-state";

export default function SlideshowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-6 py-16">
      <WorkspaceState
        tone="error"
        icon={AlertCircle}
        title="Slideshow studio could not load"
        description={
          error.message || "PostForge could not load the slideshow workspace."
        }
        action={{ label: "Try again", onClick: reset }}
        className="w-full max-w-md"
      />
    </div>
  );
}
