import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { FIRST_PAINT_CSS } from "../first-paint-css";
import "../dashboard-critical.css";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "/";

  return (
    <div id="workspace-root">
      <style>{FIRST_PAINT_CSS}</style>
      <script
        dangerouslySetInnerHTML={{
          __html: `requestAnimationFrame(function(){var l=document.createElement("link");l.rel="stylesheet";l.href="/dashboard.css";document.head.appendChild(l)})`,
        }}
      />
      <noscript>
        <link rel="stylesheet" href="/dashboard.css" />
      </noscript>
      <Sidebar />
      <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
    </div>
  );
}
