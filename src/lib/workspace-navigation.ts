export type WorkspaceNavigationLabel =
  | "Home"
  | "Jobs"
  | "Inspiration"
  | "Clone"
  | "Slideshow"
  | "Gallery"
  | "Automations"
  | "Performance"
  | "Spend"
  | "Generate"
  | "Collections"
  | "Characters"
  | "Settings";

export type WorkspaceNavigationItem = {
  label: WorkspaceNavigationLabel;
  href: string;
  match: string[];
  eyebrow: string;
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
      eyebrow: "Production",
      description: "Today’s jobs, reviews, and the next useful action.",
      primaryAction: { label: "New Clone", href: "/ugc-clone" },
    },
    {
      label: "Jobs",
      href: "/jobs",
      match: ["/jobs"],
      eyebrow: "Activity",
      description: "Track active generations and review the last 30 days of production history.",
      primaryAction: { label: "Create Asset", href: "/generate" },
    },
    {
      label: "Inspiration",
      href: "/ugc-inspiration",
      match: ["/ugc-inspiration"],
      eyebrow: "Discover",
      description: "Track creator posts and turn the strongest sources into new work.",
      primaryAction: { label: "Open Clone", href: "/ugc-clone" },
    },
    {
      label: "Clone",
      href: "/ugc-clone",
      match: ["/ugc-clone"],
      eyebrow: "Create",
      description: "Combine a source clip, identity, and reference into a new asset.",
      primaryAction: { label: "Browse Inspiration", href: "/ugc-inspiration" },
    },
    {
      label: "Slideshow",
      href: "/slideshow",
      match: ["/slideshow"],
      eyebrow: "Create",
      description: "Create, edit, automate, and export AI image carousels.",
      primaryAction: { label: "New Slideshow", href: "/slideshow?new=true" },
    },
    {
      label: "Gallery",
      href: "/gallery",
      match: ["/gallery"],
      eyebrow: "Review",
      description: "Approve, reject, download, and hand off finished media.",
      primaryAction: { label: "Create Asset", href: "/generate" },
    },
    {
      label: "Automations",
      href: "/automations",
      match: ["/automations"],
      eyebrow: "Publishing",
      description: "Schedule repeatable content loops with explicit approval rules.",
      primaryAction: { label: "New Automation", href: "/automations/new" },
    },
    {
      label: "Performance",
      href: "/performance",
      match: ["/performance"],
      eyebrow: "Content Intelligence",
      description: "Learn which posts, hooks, and formats earn meaningful attention.",
      primaryAction: { label: "Open Automations", href: "/automations" },
    },
    {
      label: "Spend",
      href: "/costs",
      match: ["/costs"],
      eyebrow: "Cost Intelligence",
      description: "See where every generation credit goes and stay on budget.",
      primaryAction: { label: "Create Asset", href: "/generate" },
    },
  ],
  tools: [
    {
      label: "Generate",
      href: "/generate",
      match: ["/generate"],
      eyebrow: "Create",
      description: "Create production-ready images and videos from structured prompts.",
      primaryAction: { label: "View Gallery", href: "/gallery" },
    },
    {
      label: "Collections",
      href: "/collections",
      match: ["/collections"],
      eyebrow: "Asset Library",
      description: "Organize reusable visual systems for Generate, Clone, and Automations.",
      primaryAction: { label: "Upload Images", href: "/collections?upload=1" },
    },
    {
      label: "Characters",
      href: "/characters",
      match: ["/characters"],
      eyebrow: "Identity Studio",
      description: "Create, refine, and reuse consistent on-screen identities.",
      primaryAction: { label: "New Character", href: "/characters/new" },
    },
  ],
  utility: [
    {
      label: "Settings",
      href: "/settings",
      match: ["/settings"],
      eyebrow: "Workspace",
      description: "Manage connections, publishing defaults, usage, and preferences.",
      primaryAction: { label: "View Integrations", href: "/settings?tab=integrations" },
    },
  ],
} as const satisfies {
  primary: WorkspaceNavigationItem[];
  tools: WorkspaceNavigationItem[];
  utility: WorkspaceNavigationItem[];
};

export const workspaceNavigationItems = [
  ...workspaceNavigationGroups.primary,
  ...workspaceNavigationGroups.tools,
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
