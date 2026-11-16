"use client";

import { Button } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";

export function GalleryLoadErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      icon="alert"
      tone="error"
      title="Gallery failed to load"
      detail={message}
      className="min-h-[340px] [&_.wb-empty-copy]:break-words [&_.wb-empty-copy]:[overflow-wrap:anywhere]"
    >
      <Button variant="strong" onClick={onRetry}>
        Retry Gallery
      </Button>
    </EmptyState>
  );
}
