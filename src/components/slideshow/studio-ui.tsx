export const CARD = "pf-card";
export const PREVIEW_ASPECT: Record<string, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "4:5": "aspect-[4/5]",
};
export const CARD_HOVER = "pf-card-hover";
export const SECONDARY_BTN =
  "pf-button-secondary h-9 px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-45";
export const INPUT =
  "w-full rounded-lg border border-border bg-card px-3 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10";
export const FIELD_LABEL =
  "mb-1.5 block text-[12px] font-semibold text-muted-foreground";
export const ICON_BTN =
  "grid size-8 shrink-0 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-[var(--pf-active)] hover:text-foreground active:scale-[0.95] disabled:opacity-35 disabled:hover:bg-transparent";
export const MAX_CREATOR_SLIDES = 20;

export function StepChip({ n }: { n: string }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-[12px] font-bold text-muted-foreground">
      {n}
    </span>
  );
}
