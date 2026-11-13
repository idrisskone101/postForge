import { WorkspaceHeaderGate } from "@/components/workspace-header-gate";

export function WorkspaceShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <main id="workspace-shell">
      <WorkspaceHeaderGate serverPathname={pathname} />
      {children}
    </main>
  );
}

export { WorkspaceRouteHeader } from "@/components/workspace-header-gate";
