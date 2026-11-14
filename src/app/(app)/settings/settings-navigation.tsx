import { CountBadge } from "@/components/workbench";
import { useHydrated } from "@/lib/use-hydrated";
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
  const hydrated = useHydrated();
  return (
    <>
      <nav
        aria-label="Settings sections"
        data-settings-nav="true"
        className="wb-scroll-fade relative flex w-full min-w-0 shrink-0 gap-0.5 overflow-x-auto overscroll-x-contain overflow-y-hidden rounded-full bg-raised p-1 [scrollbar-width:none] min-[1280px]:w-[236px] min-[1280px]:flex-col min-[1280px]:gap-3 min-[1280px]:overflow-visible min-[1280px]:rounded-xl min-[1280px]:bg-panel min-[1280px]:p-3 min-[1280px]:shadow-panel min-[1280px]:[mask-image:none]"
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
                    "wb-hit flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 [--wb-hit-h:40px] text-[13px] font-medium leading-4 text-fg-secondary outline-none transition-colors duration-[var(--pf-dur-state)] ease-pf hover:text-fg focus-visible:ring-2 focus-visible:ring-ember",
                    "min-[1280px]:h-9 min-[1280px]:justify-between min-[1280px]:[--wb-hit-h:38px] min-[1280px]:px-2.5 min-[1280px]:text-sm min-[1280px]:leading-[18px] min-[1280px]:hover:bg-raised/60",
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
      {hydrated ? null : <script>{REVEAL_BEFORE_PAINT}</script>}
    </>
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

/*
 * The active tab rests clear of the 16px edge fade with 40px of the next tab showing, so the strip
 * reads as scrollable.
 */
const REVEAL_ROOM = 56;

/*
 * The server's markup cannot carry a scroll position, and the ref callback only runs at hydration,
 * so a deep-linked tab first painted with the strip at "Profile". This runs as the parser reaches it,
 * before the first paint. It places the strip from its start, and again once the web font has changed
 * the tab widths, so every load rests at the same place. It only measures where the strip scrolls.
 */
const REVEAL_BEFORE_PAINT = `(function(){if(!matchMedia("(max-width:1279.98px)").matches)return;var n=document.currentScript.previousElementSibling,w=0;function v(){var a=n&&n.querySelector('[aria-current="page"]');if(!a||n.scrollWidth<=n.clientWidth)return;w=n.scrollWidth;var r=a.offsetLeft+a.offsetWidth;n.scrollLeft=r>n.clientWidth-${REVEAL_ROOM}?r-n.clientWidth+${REVEAL_ROOM}:0}v();if(document.fonts)document.fonts.ready.then(function(){if(n&&n.scrollWidth!==w)v()})})()`;

/** Scrolls the strip only as far as it takes to show the active tab with that room on both sides. */
function revealInRow(node: HTMLButtonElement | null) {
  const row = node?.closest("nav");
  if (!node || !row || row.scrollWidth <= row.clientWidth) return;
  const left = node.offsetLeft;
  const right = left + node.offsetWidth;
  if (left < row.scrollLeft + REVEAL_ROOM) row.scrollLeft = Math.max(0, left - REVEAL_ROOM);
  else if (right > row.scrollLeft + row.clientWidth - REVEAL_ROOM) row.scrollLeft = right - row.clientWidth + REVEAL_ROOM;
}
