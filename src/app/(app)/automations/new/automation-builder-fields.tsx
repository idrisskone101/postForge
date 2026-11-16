import { StatusBadge } from "@/components/workbench";

export function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex min-h-[44px] min-w-0 items-center gap-3 border-b border-hairline py-2.5 last:border-b-0">
      <StatusBadge tone={ok ? "ok" : "bad"} label={ok ? "Ready" : "Needs a fix"} />
      <span className="min-w-0 flex-1 break-words text-[14px] leading-5 text-fg [overflow-wrap:anywhere]">
        {text}
      </span>
    </div>
  );
}

export const HOOK_STRATEGIES = [
  "Contrarian truth",
  "Curiosity gap",
  "Unexpected result",
  "Specific transformation",
  "Concrete promise",
] as const;

export const STORY_STRUCTURES = [
  "Problem → Shift → Result",
  "3 quick lessons",
  "Before → Change → After",
  "Myth → Evidence → Reality",
  "Product → Proof → Outcome",
] as const;

export const CTA_STYLES = [
  "Save this post",
  "Follow for part two",
  "Comment a keyword",
  "Visit profile link",
  "No CTA",
] as const;

export const TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
] as const;

export const BUILDER_STEPS = [
  { id: "Hook", name: "Hook" },
  { id: "Content", name: "Content" },
  { id: "CTA", name: "Close" },
  { id: "Review", name: "Review" },
] as const;
