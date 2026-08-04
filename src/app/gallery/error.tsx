"use client";

import { TriangleAlert } from "lucide-react";
import { WorkspaceState } from "@/components/workspace-state";

export default function GalleryError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1280px] p-5 sm:p-6 lg:p-8">
      <WorkspaceState
        tone="error"
        icon={TriangleAlert}
        title="Gallery failed to load"
        description="Your assets are safe. Check the connection and try loading the review queue again."
        action={{ label: "Retry Gallery", onClick: reset }}
        secondaryAction={{ href: "/", label: "Back to Home" }}
        className="min-h-[520px]"
      />
    </div>
  );
}
