import { Button, EmptyState, Panel, StatusChip } from "@/components/workbench";
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
        detail="No events are being delivered. PostForge will not claim a webhook is active until a server-owned signing and retry pipeline is configured."
      >
        <Button disabled>Webhook delivery not configured</Button>
      </EmptyState>
      <div className="flex flex-col">
        {REQUIREMENTS.map(([title, detail]) => (
          <SettingsRow key={title} label={title} detail={detail}>
            <span className="text-sm font-medium leading-[18px] text-fg-muted">Not available</span>
          </SettingsRow>
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
