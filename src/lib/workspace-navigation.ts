export type WorkspaceNavigationLabel =
  | "Home"
  | "Jobs"
  | "Inspiration"
  | "Clone"
  | "Slideshow"
  | "Generate"
  | "Gallery"
  | "Collections"
  | "Characters"
  | "Automations"
  | "Performance"
  | "Spend"
  | "Settings";

export type WorkspacePrimaryAction = {
  label: string;
  href: string;
  icon: "plus" | "upload";
};

export type WorkspaceNavigationItem = {
  label: WorkspaceNavigationLabel;
  href: string;
  match: string[];
  /** The one bone primary in the route's page header. Absent when the design has none. */
  primaryAction?: WorkspacePrimaryAction;
};

export const workspaceNavigationGroups = {
  overview: [
    {
      label: "Home",
      href: "/",
      match: ["/"],
      primaryAction: { label: "New clone", href: "/ugc-clone", icon: "plus" },
    },
    { label: "Jobs", href: "/jobs", match: ["/jobs"] },
  ],
  create: [
    { label: "Inspiration", href: "/ugc-inspiration", match: ["/ugc-inspiration"] },
    { label: "Clone", href: "/ugc-clone", match: ["/ugc-clone"] },
    { label: "Slideshow", href: "/slideshow", match: ["/slideshow"] },
    { label: "Generate", href: "/generate", match: ["/generate"] },
  ],
  library: [
    {
      label: "Gallery",
      href: "/gallery",
      match: ["/gallery"],
      primaryAction: { label: "Start clone", href: "/ugc-clone", icon: "plus" },
    },
    {
      label: "Collections",
      href: "/collections",
      match: ["/collections"],
      primaryAction: {
        label: "Upload images",
        href: "/collections?upload=1",
        icon: "upload",
      },
    },
    {
      label: "Characters",
      href: "/characters",
      match: ["/characters"],
      primaryAction: { label: "New character", href: "/characters/new", icon: "plus" },
    },
  ],
  publish: [
    {
      label: "Automations",
      href: "/automations",
      match: ["/automations"],
      primaryAction: { label: "New automation", href: "/automations/new", icon: "plus" },
    },
    { label: "Performance", href: "/performance", match: ["/performance"] },
    { label: "Spend", href: "/costs", match: ["/costs"] },
  ],
  utility: [{ label: "Settings", href: "/settings", match: ["/settings"] }],
} as const satisfies Record<string, WorkspaceNavigationItem[]>;

/** Sidebar order: four unlabelled groups separated by a 20px gap. */
export const workspaceSidebarGroups: readonly (readonly WorkspaceNavigationItem[])[] = [
  workspaceNavigationGroups.overview,
  workspaceNavigationGroups.create,
  workspaceNavigationGroups.library,
  workspaceNavigationGroups.publish,
];

export const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  ...workspaceSidebarGroups.flat(),
  ...workspaceNavigationGroups.utility,
];

export function getActiveWorkspaceItem(pathname: string) {
  const cleanPath = pathname.split(/[?#]/)[0] || "/";

  return workspaceNavigationItems.find((item) =>
    item.match.some((match) => {
      if (match === "/") return cleanPath === "/";
      return cleanPath === match || cleanPath.startsWith(`${match}/`);
    })
  );
}

const NAV_ITEM_HEIGHT = 36;
const NAV_ITEM_GAP = 2;
const NAV_GROUP_GAP = 20;

/** Vertical offset of an item inside the sidebar nav, for the sliding active pill. */
export function getSidebarPillOffset(href: string | undefined): number | null {
  let offset = 0;
  for (const group of workspaceSidebarGroups) {
    const index = group.findIndex((item) => item.href === href);
    if (index >= 0) return offset + index * (NAV_ITEM_HEIGHT + NAV_ITEM_GAP);
    offset +=
      group.length * NAV_ITEM_HEIGHT + (group.length - 1) * NAV_ITEM_GAP + NAV_GROUP_GAP;
  }
  return null;
}
