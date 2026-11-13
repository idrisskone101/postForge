import { cn } from "@/lib/utils";
import { TEMPLATE_VISUALS } from "./playbook-model";

export function playbookArtClass(templateId: string, className?: string) {
  return cn("relative shrink-0 overflow-hidden", TEMPLATE_VISUALS[templateId], className);
}

export const PLAYBOOK_ART_NUMBER =
  "absolute left-4 top-3.5 font-bold text-[var(--pf-on-media)]";

/**
 * The server first paint renders the picker without handlers. Binding through
 * here keeps a missing handler `undefined`, never a function the server would
 * have to serialise.
 */
export function bindPlaybookHandler<T>(
  handler: ((value: T) => void) | undefined,
  value: T
) {
  return handler ? () => handler(value) : undefined;
}

export function playbookFieldProps(
  value: string,
  onChange: ((value: string) => void) | undefined
) {
  if (!onChange) return { defaultValue: value };
  return {
    value,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };
}

export function playbookSegmentCountClass(active: boolean) {
  return cn(
    "text-[12px] font-normal tabular-nums",
    active ? "text-fg-secondary" : "text-fg-muted"
  );
}
