import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { FIRST_PAINT_CSS } from "../first-paint-css";
import "../globals.css";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "/";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{FIRST_PAINT_CSS}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement,t=localStorage.getItem("postforge-theme"),s=localStorage.getItem("postforge-sidebar-collapsed");r.classList.toggle("dark",t!=="light");if(s==="true")r.dataset.sidebarCollapsed="true";else delete r.dataset.sidebarCollapsed}catch(e){document.documentElement.classList.add("dark");delete document.documentElement.dataset.sidebarCollapsed}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <div id="workspace-root">
          <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
          <Sidebar />
        </div>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "PostForge",
  description: "Self-hosted AI content generation platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
