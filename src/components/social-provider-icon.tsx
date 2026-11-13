import Image from "next/image";
import { cn } from "@/lib/utils";

export type SocialProviderIconName = "tiktok" | "instagram" | "youtube";

type SocialProviderIconProps = {
  provider: SocialProviderIconName;
  className?: string;
  label?: string;
  youtubeVariant?: "provider" | "shorts";
};

/**
 * The provider's own logo asset. TikTok and Instagram sit on a white chip so
 * the black and gradient marks read on both themes. The logo is sized as a
 * share of the chip, never with percentage padding: that resolves against the
 * parent's width and collapsed the image to 0x0.
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

  return (
    <span
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center overflow-hidden",
        provider !== "youtube" && "rounded-[22%] bg-white",
        className
      )}
      {...accessibility}
    >
      <Image
        src={source}
        alt=""
        width={24}
        height={24}
        unoptimized
        className={cn("block object-contain", LOGO_SCALE[provider])}
      />
    </span>
  );
}

const LOGO_SCALE: Record<SocialProviderIconName, string> = {
  tiktok: "size-[70%]",
  instagram: "size-[84%]",
  youtube: "size-full",
};

const BRAND_ASSETS = {
  tiktok: "/brands/tiktok.svg",
  instagram: "/brands/instagram.svg",
  youtube: "/brands/youtube.svg",
  shorts: "/brands/youtube-shorts.svg",
} as const;
