import type { ReactNode } from "react";

/** Paths are copied from the Paper file. Names marked "drawn" have no Paper source and follow the same grid. */
export const ICON_PATHS = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  jobs: <path d="M4 6h16M4 12h16M4 18h10" />,
  inspiration: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M15 9l-2 4-4 2 2-4z" />
    </>
  ),
  clone: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </>
  ),
  slideshow: (
    <>
      <rect x="7" y="5" width="10" height="14" rx="2.5" />
      <path d="M3.5 8v8M20.5 8v8" />
    </>
  ),
  generate: (
    <path d="M12 3.5l2.2 6.3 6.3 2.2-6.3 2.2-2.2 6.3-2.2-6.3-6.3-2.2 6.3-2.2z" />
  ),
  gallery: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M4 15l4-4 5 5 3-3 4 4" />
    </>
  ),
  collections: (
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2.5h5.5A2.5 2.5 0 0 1 20 10v6.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
  ),
  characters: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  automations: (
    <path d="M5 11a7 7 0 0 1 12.5-3.5L19 9M19 5v4h-4M19 13a7 7 0 0 1-12.5 3.5L5 15M5 19v-4h4" />
  ),
  performance: <path d="M5 20v-8M12 20V5M19 20v-5" />,
  spend: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7.5h9M18 7.5h2M4 16.5h2M11 16.5h9" />
      <circle cx="15.5" cy="7.5" r="2.5" />
      <circle cx="8.5" cy="16.5" r="2.5" />
    </>
  ),
  logo: <path d="M7 20V5h7a4 4 0 0 1 0 8H7" />,
  sidebar: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M10 5v14" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" />
    </>
  ),
  copy: <path d="M9 9h10v10H9zM5 15V5h10" />,
  shuffle: <path d="M4 8h3l10 8h3M4 16h3l3-2.4M14 10.4L17 8h3M18 6l2 2-2 2M18 14l2 2-2 2" />,
  rerender: <path d="M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4" />,
  /* drawn */
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  /* drawn */
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "check-chosen": <path d="M6 12.5l4 4 8-9" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: <path d="M12 8v5M12 16.5v.5M12 3.5l9 16H3z" />,
  exclamation: <path d="M12 6v8M12 18v.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "chevron-down": <path d="M6 9.5l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  list: <path d="M4 6h16M4 12h16M4 18h16" />,
  pencil: <path d="M5 19l1-4L16 5l3 3L9 18z" />,
  link: (
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  ),
  refresh: (
    <path d="M5 11a7 7 0 0 1 12.5-3.5L19 9M19 5v4h-4M19 13a7 7 0 0 1-12.5 3.5L5 15M5 19v-4h4" />
  ),
  /* drawn */
  download: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />,
  /* drawn */
  upload: <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICON_PATHS;
