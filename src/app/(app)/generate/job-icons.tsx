import type { ReactNode, SVGProps } from "react";
import type { JobIconName } from "./job-enhancements";

export function JobIcon({
  name,
  size = 18,
  strokeWidth = 1.5,
  ...rest
}: SVGProps<SVGSVGElement> & { name: JobIconName; size?: number }) {
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
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

const PATHS: Record<JobIconName, ReactNode> = {
  share: (
    <path d="M12 15V4M8 8l4-4 4 4M5 13v4.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V13" />
  ),
  "zoom-out": (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4M8.5 11h5" />
    </>
  ),
  "zoom-in": (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4M8.5 11h5M11 8.5v5" />
    </>
  ),
  crop: <path d="M7 3.5V17h13.5M3.5 7H17v13.5" />,
  fullscreen: (
    <path d="M4.5 9.5v-5h5M19.5 9.5v-5h-5M4.5 14.5v5h5M19.5 14.5v5h-5" />
  ),
  upscale: <path d="M5 19L19 5M12 5h7v7" />,
  relight: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" />
    </>
  ),
  "remove-object": <path d="M8.5 19h11M5 15.5l8.5-9.5 5 4.5-7.5 8.5H8z" />,
  "expand-frame": (
    <>
      <rect x="8" y="8" width="8" height="8" rx="1.5" />
      <path d="M4.5 9V4.5H9M19.5 9V4.5H15M4.5 15v4.5H9M19.5 15v4.5H15" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </>
  ),
  retry: <path d="M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4" />,
};
