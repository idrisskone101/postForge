"use client";

import { TriangleAlert } from "lucide-react";
import { WorkspaceState } from "@/components/workspace-state";

export default function CostsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1280px] p-5 sm:p-6 lg:p-8">
      <WorkspaceState
        tone="error"
        icon={TriangleAlert}
        title="Spend data couldn’t load"
        description="Your generation records are safe. Check the connection and try loading cost intelligence again."
        action={{ label: "Retry Spend", onClick: reset }}
        secondaryAction={{ href: "/", label: "Back to Home" }}
        className="min-h-[520px]"
      />
    </div>
  );
}
