import { EmptyState, Panel, StatusChip } from "@/components/workbench";
import { SettingsRow } from "./settings-row";

export function DeveloperSettingsPanel() {
  return (
    <Panel
      pad="wide"
      title="Webhooks"
      data-developer-settings-panel="webhooks"
      action={<StatusChip tone="neutral">Not configured</StatusChip>}
    >
      <EmptyState
        icon="link"
        title="No webhook endpoints are registered"
        detail="No events are being delivered."
      />
      <div className="flex flex-col">
        <h3 className="wb-label pb-2">Required before delivery</h3>
        {REQUIREMENTS.map(([title, detail]) => (
          <SettingsRow key={title} label={title} detail={detail} />
        ))}
      </div>
    </Panel>
  );
}

const REQUIREMENTS = [
  ["Signed events", "Server-owned signing secret"],
  ["Reliable delivery", "Retries and failure handling"],
  ["Delivery history", "Status and response audit log"],
] as const;
