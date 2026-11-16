import { Children, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";
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
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonClass(variant, size, block), className)}
      data-icon={endsWithIcon(children) ? "end" : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * A label followed by an icon. CSS cannot tell this from an icon followed by a label when the
 * label is a bare text node, since the icon is the first and the last element child either way.
 */
function endsWithIcon(children: ReactNode) {
  const items = Children.toArray(children);
  return items.length > 1 && typeof items[0] === "string" && isValidElement(items[items.length - 1]);
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
