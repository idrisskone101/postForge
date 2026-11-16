"use client";

import { Button } from "@/components/workbench";

export function CloneStartOver() {
  return (
    <Button size={40} onClick={() => window.location.assign("/ugc-clone")}>
      Start over
    </Button>
  );
}
