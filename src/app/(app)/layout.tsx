import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ClickFocus } from "@/components/click-focus";
import { FocusReveal } from "@/components/focus-reveal";
import { ScrollFadeFallback } from "@/components/scroll-fade-fallback";
import { ShellStateSync } from "@/components/shell-state-sync";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { isMissingPagePath } from "@/lib/app-routes";
import { getActiveWorkspaceItem } from "@/lib/workspace-navigation";
import { readWorkspaceName } from "@/lib/workspace-name";
import { FIRST_PAINT_CSS } from "../first-paint-css";
import "../globals.css";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [requestHeaders, workspaceName] = await Promise.all([headers(), readWorkspaceName()]);
  const pathname = requestHeaders.get("x-pathname") || "/";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/figtree-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <style>{FIRST_PAINT_CSS}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement,t=localStorage.getItem("postforge-theme"),s=localStorage.getItem("postforge-sidebar-collapsed");r.classList.toggle("dark",t!=="light");if(s==="true")r.dataset.sidebarCollapsed="true";else delete r.dataset.sidebarCollapsed}catch(e){document.documentElement.classList.add("dark");delete document.documentElement.dataset.sidebarCollapsed}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <ShellStateSync />
        <div id="workspace-root">
          <a href="#workspace-shell" className="wb-skip-link">
            Skip to content
          </a>
          <Sidebar initialWorkspaceName={workspaceName} />
          <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
        </div>
        <FocusReveal />
        <ClickFocus />
        <ScrollFadeFallback />
      </body>
    </html>
  );
}

/** A route without a title of its own is named after its navigation item. */
export async function generateMetadata(): Promise<Metadata> {
  // The middleware names the path. A request it does not see (a missing file) has no section.
  const pathname = (await headers()).get("x-pathname");
  const section =
    pathname === null
      ? undefined
      : isMissingPagePath(pathname)
        ? "Page not found"
        : getActiveWorkspaceItem(pathname)?.label;
  return {
    title: section ? `${section} - PostForge` : "PostForge",
    description: "Self-hosted AI content generation platform",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
