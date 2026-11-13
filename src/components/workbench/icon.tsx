import type { SVGProps } from "react";
import { ICON_PATHS, type IconName } from "./icon-paths";

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
};

/** Workbench line icon: 24 viewBox, 1.5 stroke, round caps. Colour follows `currentColor`. */
export function Icon({ name, size = 18, strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

export type { IconName };
