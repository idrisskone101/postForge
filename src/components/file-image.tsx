"use client";

import Image from "next/image";
import { MEDIA_REVEAL_CLASS, useMediaReveal } from "@/components/workbench/media-image";
import { cn } from "@/lib/utils";

export function FileImage({
  src,
  alt,
  sizes,
  fit = "cover",
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const reveal = useMediaReveal();
  return (
    <Image
      {...reveal.props}
      onLoad={reveal.markLoaded}
      onError={reveal.markLoaded}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      className={cn(
        MEDIA_REVEAL_CLASS,
        fit === "contain" ? "object-contain" : "object-cover",
        className
      )}
    />
  );
}
