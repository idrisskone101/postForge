import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CircleDollarSign,
  Code2,
  Loader2,
  Save,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";
import type { SettingsFormModel } from "./types";

export function SettingsForm({ form }: { form: SettingsFormModel }) {
  const { tab, settings, setSettings, saving, onSave } = form;
  const info = formCopy(tab);
  const Icon = info.icon;
  return (
    <div>
      <span className="grid size-10 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <h2 className="pf-section-title mt-4">{info.title}</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">{info.description}</p>
      <div className="pf-card mt-6 max-w-[620px] space-y-5 p-5">
        {tab === "profile" && (
          <>
            <Field label="Workspace name">
              <input
                value={settings.workspaceName}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, workspaceName: event.target.value }))
                }
              />
            </Field>
            <Field label="Default timezone">
              <select
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
            </Field>
          </>
        )}
        {tab === "publishing" && (
          <Toggle
            label="Require approval by default"
            detail="New automations begin with a human review gate"
            checked={settings.approvalDefault}
            onChange={(checked) =>
              setSettings((current) => ({ ...current, approvalDefault: checked }))
            }
          />
        )}
        {tab === "notifications" && (
          <>
            <Toggle
              label="Generation failures"
              detail="Show failed generation counts in the workspace navigation"
              checked={settings.emailFailures}
              onChange={(checked) =>
                setSettings((current) => ({ ...current, emailFailures: checked }))
              }
            />
            <Toggle
              label="Approval requests"
              detail="Show outputs awaiting review in the workspace navigation"
              checked={settings.emailApprovals}
              onChange={(checked) =>
                setSettings((current) => ({ ...current, emailApprovals: checked }))
              }
            />
          </>
        )}
        <div className="flex justify-end border-t border-border pt-4">
          <button onClick={onSave} disabled={saving} className="pf-button-primary">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function Billing() {
  return (
    <div>
      <span className="grid size-10 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
        <CircleDollarSign className="size-4" />
      </span>
      <h2 className="pf-section-title mt-4">Billing & usage</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        This self-hosted workspace tracks provider spend rather than charging a PostForge subscription.
      </p>
      <div className="mt-6 grid max-w-[720px] gap-3 sm:grid-cols-2">
        <div className="pf-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Plan
          </p>
          <b className="mt-2 block text-[15px]">Self-hosted</b>
          <p className="mt-1 text-[11px] text-muted-foreground">No PostForge subscription configured.</p>
        </div>
        <div className="pf-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Provider costs
          </p>
          <b className="mt-2 block text-[15px]">Tracked live</b>
          <Link
            href="/costs"
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--pf-link)]"
          >
            Open Spend <ChevronRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Team() {
  return (
    <div>
      <span className="grid size-10 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
        <Users className="size-4" />
      </span>
      <h2 className="pf-section-title mt-4">Team</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        PostForge is currently running as one local workspace.
      </p>
      <div className="pf-card mt-6 max-w-[620px] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-foreground text-[12px] font-bold text-[var(--pf-canvas)]">
            PF
          </span>
          <div>
            <b className="block text-[12px]">Local administrator</b>
            <p className="mt-1 text-[12px] text-muted-foreground">Full access · local runtime</p>
          </div>
          <span className="ml-auto rounded-full bg-[var(--pf-success)]/10 px-2 py-1 text-[11px] font-bold text-[var(--pf-success)]">
            ACTIVE
          </span>
        </div>
        <div className="mt-5 rounded-lg border border-dashed border-[var(--pf-border-strong)] p-4 text-center">
          <Code2 className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            User accounts and workspace permissions need an authentication owner before invitations can be enabled.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
      <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0 [&_input]:h-9 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-border [&_input]:bg-[var(--pf-surface)] [&_input]:px-3 [&_input]:text-[11px] [&_input]:text-[var(--pf-ink)] [&_select]:h-9 [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:border-border [&_select]:bg-[var(--pf-surface)] [&_select]:px-3 [&_select]:text-[11px] [&_select]:text-[var(--pf-ink)]">
        {children}
      </span>
    </label>
  );
}

function Toggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3">
      <span className="min-w-0">
        <b className="block text-[11px]">{label}</b>
        <small className="mt-1 block break-words text-[12px] text-muted-foreground">{detail}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-[var(--pf-orange)]"
      />
    </label>
  );
}

const FORM_COPY = {
  profile: {
    title: "Profile",
    description: "Workspace identity and timezone.",
    icon: UserRound,
  },
  publishing: {
    title: "Publishing defaults",
    description: "Set safe defaults for new automations.",
    icon: Settings2,
  },
  notifications: {
    title: "Notifications",
    description: "Choose which live workspace events appear in the navigation rail.",
    icon: Bell,
  },
} as const;

function formCopy(tab: string) {
  if (tab === "profile") return FORM_COPY.profile;
  if (tab === "publishing") return FORM_COPY.publishing;
  return FORM_COPY.notifications;
}
