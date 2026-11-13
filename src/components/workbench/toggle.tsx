import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name when there is no visible label wired with aria-labelledby. */
  label?: string;
};

/** 48 by 28 switch. On is ember. */
export function Toggle({ checked, onCheckedChange, label, className, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn("wb-toggle", className)}
      onClick={() => onCheckedChange(!checked)}
      {...rest}
    />
  );
}
