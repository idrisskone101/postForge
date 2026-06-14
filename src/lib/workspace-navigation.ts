export type WorkspaceNavigationItem = {
  label: "Home" | "Inspiration" | "Clone" | "Gallery" | "Spend" | "Generate";
  href: string;
  match: string[];
  description: string;
  primaryAction: {
    label: string;
    href: string;
  };
};

export const workspaceNavigationGroups = {
  primary: [
    {
      label: "Home",
      href: "/",
      match: ["/"],
      description: "Production overview and recent output.",
      primaryAction: { label: "New Clone", href: "/ugc-clone" },
    },
    {
      label: "Inspiration",
      href: "/ugc-inspiration",
      match: ["/ugc-inspiration"],
      description: "Find creator posts worth turning into new assets.",
      primaryAction: { label: "Open Clone", href: "/ugc-clone" },
    },
    {
      label: "Clone",
      href: "/ugc-clone",
      match: ["/ugc-clone"],
      description: "Build a clone from a source clip, identity, and reference image.",
      primaryAction: { label: "Browse Inspiration", href: "/ugc-inspiration" },
    },
    {
      label: "Gallery",
      href: "/gallery",
      match: ["/gallery"],
      description: "Review finished media and hand off assets.",
      primaryAction: { label: "Create Asset", href: "/generate" },
    },
    {
      label: "Spend",
      href: "/costs",
      match: ["/costs"],
      description: "Track generation spend and model usage.",
      primaryAction: { label: "Create Asset", href: "/generate" },
    },
  ],
  tools: [
    {
      label: "Generate",
      href: "/generate",
      match: ["/generate"],
      description: "Create images and videos from prompt settings.",
      primaryAction: { label: "View Gallery", href: "/gallery" },
    },
  ],
} as const satisfies {
  primary: WorkspaceNavigationItem[];
  tools: WorkspaceNavigationItem[];
};

export const workspaceNavigationItems = [
  ...workspaceNavigationGroups.primary,
  ...workspaceNavigationGroups.tools,
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
