import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type SocialProviderIconName = "tiktok" | "instagram" | "youtube";

type SocialProviderIconProps = {
  provider: SocialProviderIconName;
  className?: string;
  label?: string;
  youtubeVariant?: "provider" | "shorts";
};

/**
 * The provider's own logo asset, drawn as a mask filled with the text colour:
 * bone in dark, ink in light, so ember stays the only colour on the page.
 * Each asset is a single-path silhouette, so the mark keeps its shape.
 */
export function SocialProviderIcon({
  provider,
  className,
  label,
  youtubeVariant = "provider",
}: SocialProviderIconProps) {
  const source =
    provider === "youtube" && youtubeVariant === "shorts"
      ? BRAND_ASSETS.shorts
      : BRAND_ASSETS[provider];
  const accessibility = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  const mask = `url(${source}) center / contain no-repeat`;
  const style: CSSProperties = { mask, WebkitMask: mask };

  return (
    <span
      className={cn("block size-5 shrink-0 bg-current text-fg", className)}
      style={style}
      {...accessibility}
    />
  );
}

const BRAND_ASSETS = {
  tiktok: "/brands/tiktok.svg",
  instagram: "/brands/instagram.svg",
  youtube: "/brands/youtube.svg",
  shorts: "/brands/youtube-shorts.svg",
} as const;
