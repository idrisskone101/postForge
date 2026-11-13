import Link from "next/link";
import { Button, buttonClass, Panel, StatusChip, Toggle } from "@/components/workbench";
import { PanelFoot, SettingsRow } from "./settings-row";
import type { SettingsFormModel } from "./types";

export function SettingsForm({ form }: { form: SettingsFormModel }) {
  const { tab, settings, setSettings, saving, onSave } = form;
  return (
    <Panel pad="wide" title={FORM_TITLES[tab]} className="gap-2">
      <div className="flex flex-col">
        {tab === "profile" && (
          <>
            <SettingsRow label="Workspace name" detail="Shown in the sidebar" htmlFor="settings-workspace-name">
              <input
                id="settings-workspace-name"
                className="wb-input sm:w-[340px] sm:shrink-0"
                value={settings.workspaceName}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, workspaceName: event.target.value }))
                }
              />
            </SettingsRow>
            <SettingsRow label="Default timezone" htmlFor="settings-timezone">
              <select
                id="settings-timezone"
                className="wb-input sm:w-[340px] sm:shrink-0"
                value={settings.timezone}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, timezone: event.target.value }))
                }
              >
                <option>America/Toronto</option>
                <option>America/New_York</option>
                <option>America/Los_Angeles</option>
                <option>Europe/London</option>
              </select>
            </SettingsRow>
          </>
        )}
        {tab === "publishing" && (
          <SettingsRow label="Require approval by default" detail="New automations begin with a human review gate">
            <Toggle
              label="Require approval by default"
              checked={settings.approvalDefault}
              onCheckedChange={(checked) =>
                setSettings((current) => ({ ...current, approvalDefault: checked }))
              }
            />
          </SettingsRow>
        )}
        {tab === "notifications" && (
          <>
            <SettingsRow label="Generation failures" detail="Failed count on Jobs in the sidebar">
              <Toggle
                label="Generation failures"
                checked={settings.emailFailures}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({ ...current, emailFailures: checked }))
                }
              />
            </SettingsRow>
            <SettingsRow label="Approval requests" detail="Waiting count on Gallery in the sidebar">
              <Toggle
                label="Approval requests"
                checked={settings.emailApprovals}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({ ...current, emailApprovals: checked }))
                }
              />
            </SettingsRow>
          </>
        )}
      </div>
      <PanelFoot>
        <Button variant="primary" size={40} onClick={onSave} disabled={saving} aria-busy={saving}>
          {saving ? "Saving" : "Save changes"}
        </Button>
      </PanelFoot>
    </Panel>
  );
}

export function Billing() {
  return (
    <Panel pad="wide" title="Billing & usage" className="gap-2">
      <div className="flex flex-col">
        <SettingsRow label="Plan" detail="No PostForge subscription configured">
          <span className="text-sm font-semibold text-fg">Self-hosted</span>
        </SettingsRow>
        <SettingsRow label="Provider costs" detail="Tracked live">
          <Link href="/costs" className={buttonClass("quiet", 36)}>
            Open Spend
          </Link>
        </SettingsRow>
      </div>
    </Panel>
  );
}

export function Team() {
  return (
    <Panel pad="wide" title="Team" className="gap-2">
      <div className="flex flex-col">
        <SettingsRow label="Local administrator" detail="Full access, local runtime">
          <StatusChip tone="ok" icon="check" className="self-start sm:self-auto">
            Active
          </StatusChip>
        </SettingsRow>
      </div>
      <p className="wb-notice">
        User accounts and workspace permissions need an authentication owner before invitations can be enabled.
      </p>
    </Panel>
  );
}

const FORM_TITLES: Record<SettingsFormModel["tab"], string> = {
  profile: "Profile",
  publishing: "Publishing defaults",
  notifications: "Notifications",
};
