import Image from "next/image";
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
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      className={cn(
        fit === "contain" ? "object-contain" : "object-cover",
        className
      )}
    />
  );
}
