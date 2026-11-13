import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  chosen?: boolean;
  /** Show the leading check when chosen (template chips do, day chips do not). */
  check?: boolean;
};

/** Choosable chip. Chosen draws the ember wash and a 2px ember ring. */
export function Chip({
  chosen = false,
  check = true,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      className={cn("wb-chip", className)}
      {...rest}
    >
      {check && <Icon name="check-chosen" size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}
