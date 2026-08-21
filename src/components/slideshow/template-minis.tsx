"use client";

import { VisualTile } from "./slide-preview";
import type { SlideshowTemplate } from "./types";

export function TemplateMinis({ template }: { template: SlideshowTemplate }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {template.visualKeys.map((visualKey, index) => {
        const slide = template.slides[index];
        return (
          <div
            key={`${visualKey}-${index}`}
            className="relative aspect-[9/16] overflow-hidden rounded-lg"
          >
            <VisualTile visualKey={visualKey} className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/55" />
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-full bg-black/45 px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.08em] text-white/90">
                Hook
              </span>
            ) : null}
            <p className="absolute inset-x-1.5 bottom-1.5 text-left text-[8px] font-semibold leading-[1.25] text-white">
              {index === 0
                ? template.hook
                : (slide?.headline ?? "What I would do again")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
