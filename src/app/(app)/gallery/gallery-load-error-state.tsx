"use client";

import { WorkspaceState } from "@/components/workspace-state";
import { TriangleAlert } from "lucide-react";

export function GalleryLoadErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <WorkspaceState
      tone="error"
      icon={TriangleAlert}
      title="Gallery failed to load"
      description={message}
      action={{ label: "Retry Gallery", onClick: onRetry }}
      className="min-h-64 min-w-0 [&>p]:min-w-0 [&>p]:break-words [&>p]:[overflow-wrap:anywhere] [&_a]:shrink-0 [&_button]:shrink-0 [&_svg]:shrink-0"
    />
  );
}
