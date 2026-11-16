import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";

export const DEFAULT_WORKSPACE_NAME = "PostForge";

/** The stored workspace name for the first server frame, so the sidebar brand never swaps text after load. */
export async function readWorkspaceName(): Promise<string> {
  try {
    const records = await readWorkspaceFeatureRecords<{ id: string; workspaceName?: unknown }>(
      "connections"
    );
    const name = records.find((record) => record.id === "workspace-settings")?.workspaceName;
    return (typeof name === "string" && name.trim()) || DEFAULT_WORKSPACE_NAME;
  } catch {
    return DEFAULT_WORKSPACE_NAME;
  }
}
