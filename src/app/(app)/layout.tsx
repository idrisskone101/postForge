import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceShell } from "@/components/workspace-shell";
import "../globals.css";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "/";

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <WorkspaceShell pathname={pathname}>{children}</WorkspaceShell>
    </div>
  );
}
