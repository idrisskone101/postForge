"use client";

import Link from "next/link";
import { CircleHelp, History } from "lucide-react";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { GeneratePaintText } from "./generate-paint-text";

export function GenerateHeaderAccessory() {
  const paintReady = useWindowLoadReady();

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/gallery"
        prefetch={false}
        data-generate-history={paintReady ? undefined : "History"}
        className="pf-button-secondary h-9"
      >
        <History className="size-3.5" />
        <GeneratePaintText
          ready={paintReady}
          liveClassName="max-md:sr-only"
          paint={<span className="sr-only">History</span>}
        >
          History
        </GeneratePaintText>
      </Link>
      <Link
        href="/settings"
        prefetch={false}
        aria-label="Generation help"
        className="pf-button-secondary size-9 px-0"
      >
        <CircleHelp className="size-3.5" />
      </Link>
    </div>
  );
}
