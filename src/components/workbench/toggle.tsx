import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name when there is no visible label wired with aria-labelledby. */
  label?: string;
  /** Track height. 28 is 48 wide (Automations, Settings), 26 is 44 wide (Clone, Slideshow). */
  size?: 28 | 26;
};

/** Switch. On is ember. */
export function Toggle({ checked, onCheckedChange, label, size = 28, className, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-size={size === 26 ? "26" : undefined}
      className={cn("wb-toggle", className)}
      onClick={() => onCheckedChange(!checked)}
      {...rest}
    />
  );
}
