import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

export type IconButtonVariant = "quiet" | "strong" | "outline" | "ghost";
export type IconButtonSize = 40 | 34 | 30 | 28;

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

export function IconButton({
  icon,
  label,
  variant = "quiet",
  size = 34,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(iconButtonClass(variant, size), className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

/** Class string for a round icon button. Use it on a `<Link>` or `<a>`. */
export function iconButtonClass(
  variant: IconButtonVariant = "quiet",
  size: IconButtonSize = 34
) {
  return cn(
    "wb-icon-btn",
    variant !== "quiet" && `wb-icon-btn-${variant}`,
    size !== 34 && `wb-icon-btn-${size}`
  );
}
