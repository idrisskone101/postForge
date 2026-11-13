import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "strong"
  | "quiet"
  | "outline"
  | "danger"
  | "link";
export type ButtonSize = 40 | 38 | 36 | 32;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

/**
 * Pill button. `primary` is the one bone action per screen, `danger` stays
 * labelled, `outline` is for buttons sitting on a raised surface.
 */
export function Button({
  variant = "quiet",
  size = 36,
  block = false,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonClass(variant, size, block), className)}
      {...rest}
    />
  );
}

/** Class string for a Workbench pill button. Use it on a `<Link>` or `<a>`. */
export function buttonClass(
  variant: ButtonVariant = "quiet",
  size: ButtonSize = 36,
  block = false
) {
  return cn(
    "wb-btn",
    variant !== "quiet" && `wb-btn-${variant}`,
    size !== 36 && `wb-btn-${size}`,
    block && "wb-btn-block"
  );
}
