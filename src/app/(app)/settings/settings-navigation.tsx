import { CountBadge } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { SettingsTab } from "./types";

/**
 * Settings sub-nav. From 1280px it is the 236px text list in a panel; below
 * it is one horizontally scrolling segmented row.
 */
export function SettingsNavigation({
  tab,
  onSelect,
  attention = 0,
}: {
  tab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  attention?: number;
}) {
  return (
    <nav
      aria-label="Settings sections"
      data-settings-nav="true"
      className="relative flex w-full min-w-0 shrink-0 gap-0.5 overflow-x-auto overscroll-x-contain rounded-full bg-raised p-1 [scrollbar-width:none] min-[1280px]:w-[236px] min-[1280px]:flex-col min-[1280px]:gap-3 min-[1280px]:overflow-visible min-[1280px]:rounded-xl min-[1280px]:bg-panel min-[1280px]:p-3 min-[1280px]:shadow-panel"
    >
      {GROUPS.map((group) => (
        <div
          key={group}
          className={cn(
            "contents min-[1280px]:flex min-[1280px]:flex-col min-[1280px]:gap-0.5",
            group === "developer" && "min-[1280px]:border-t min-[1280px]:border-hairline min-[1280px]:pt-3"
          )}
        >
          {SETTINGS_NAVIGATION.filter((item) => item.group === group).map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                type="button"
                key={id}
                ref={active ? revealInRow : undefined}
                onClick={() => onSelect(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "wb-hit flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium leading-4 text-fg-secondary outline-none transition-colors duration-[var(--pf-dur-state)] ease-pf hover:text-fg focus-visible:ring-2 focus-visible:ring-ember",
                  "min-[1280px]:h-9 min-[1280px]:justify-between min-[1280px]:px-2.5 min-[1280px]:text-sm min-[1280px]:leading-[18px] min-[1280px]:hover:bg-raised/60",
                  active &&
                    "bg-[var(--pf-segment)] font-semibold text-fg shadow-[var(--pf-segment-shadow)] min-[1280px]:bg-raised min-[1280px]:pr-2 min-[1280px]:shadow-none min-[1280px]:hover:bg-raised"
                )}
              >
                {label}
                {id === "integrations" && (
                  <CountBadge
                    count={attention}
                    tone="warn"
                    label={`${attention} ${attention === 1 ? "integration needs" : "integrations need"} attention`}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export const SETTINGS_NAVIGATION = [
  { id: "profile", label: "Profile", group: "workspace" },
  { id: "models", label: "Available models", group: "workspace" },
  { id: "billing", label: "Billing & usage", group: "workspace" },
  { id: "integrations", label: "Integrations", group: "workspace" },
  { id: "publishing", label: "Publishing defaults", group: "workspace" },
  { id: "team", label: "Team", group: "workspace" },
  { id: "notifications", label: "Notifications", group: "workspace" },
  { id: "api-keys", label: "API keys", group: "developer" },
  { id: "webhooks", label: "Webhooks", group: "developer" },
] as const satisfies ReadonlyArray<{ id: SettingsTab; label: string; group: string }>;

export function isSettingsTab(value: string): value is SettingsTab {
  return SETTINGS_NAVIGATION.some((item) => item.id === value);
}

const GROUPS = ["workspace", "developer"] as const;

function revealInRow(node: HTMLButtonElement | null) {
  const row = node?.closest("nav");
  if (!node || !row || row.scrollWidth <= row.clientWidth) return;
  row.scrollLeft = Math.max(0, node.offsetLeft - 16);
}
