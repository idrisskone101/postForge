import Image from "next/image";
import { cn } from "@/lib/utils";

export type SocialProviderIconName = "tiktok" | "instagram" | "youtube";

type SocialProviderIconProps = {
  provider: SocialProviderIconName;
  className?: string;
  label?: string;
  youtubeVariant?: "provider" | "shorts";
};

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
        "relative grid size-5 shrink-0 place-items-center overflow-hidden",
        provider === "tiktok" && "rounded-[22%] bg-white p-[13%]",
        provider === "instagram" && "rounded-[22%] bg-white p-[7%]",
        provider === "youtube" && "p-[3%]",
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
        className="size-full object-contain"
      />
    </span>
  );
}


const BRAND_ASSETS = {
  tiktok: "/brands/tiktok.svg",
  instagram: "/brands/instagram.svg",
  youtube: "/brands/youtube.svg",
  shorts: "/brands/youtube-shorts.svg",
} as const;