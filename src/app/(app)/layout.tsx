import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar-lazy";
import { WorkspaceShell } from "@/components/workspace-shell";
import { FIRST_PAINT_CSS } from "../first-paint-css";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "/";

  return (
    <div id="workspace-root">
      <style>{FIRST_PAINT_CSS}</style>
      <link rel="preload" href="/dashboard.css" as="style" />
      <link id="pf-dashboard-css" rel="stylesheet" href="/dashboard.css" media="print" />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(l){function r(){l.media="all"}if(!l)return;l.addEventListener("load",r);if(l.sheet)r()})(document.getElementById("pf-dashboard-css"))`,
        }}
      />
      <noscript>
        <link rel="stylesheet" href="/dashboard.css" />
      </noscript>
      <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
      <Sidebar />
    </div>
  );
}
