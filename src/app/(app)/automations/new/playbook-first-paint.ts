/**
 * The playbook picker paints first as server HTML with no JavaScript. The real
 * client loads on idle. A click or Escape that lands on the server copy before
 * then is recorded by its `data-playbook-key` and replayed on the identical
 * control of the live picker, so it is never lost.
 */

const FIRST_PAINT = "[data-playbook-first-paint]";
const KEYED = "[data-playbook-key]";

let pendingKey: string | null = null;
let disarm: (() => void) | null = null;

export function armPlaybookFirstPaint(load: () => void) {
  const root = document.querySelector<HTMLElement>(FIRST_PAINT);
  const cancelIdle = whenIdle(load);
  if (!root) return cancelIdle;

  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest<HTMLElement>(`button${KEYED}`);
    const onScrim = target?.matches("[data-automation-overlay]") ?? false;
    pendingKey = control?.dataset.playbookKey ?? (onScrim ? "close" : pendingKey);
    load();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") pendingKey = "close";
    load();
  };
  root.addEventListener("click", onClick);
  window.addEventListener("keydown", onKeyDown);
  disarm = () => {
    cancelIdle();
    root.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
  };
  return disarm;
}

/** Runs in the live picker's first layout effect, before it paints. */
export function handOffPlaybookFirstPaint() {
  disarm?.();
  disarm = null;
  const root = document.querySelector<HTMLElement>(FIRST_PAINT);
  if (!root || root.hidden) return;
  const live = Array.from(
    document.querySelectorAll<HTMLElement>("[data-automation-overlay]")
  ).find((overlay) => !root.contains(overlay));
  const focusedKey = root.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.playbookKey
    : undefined;
  const fields = Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      `input${KEYED}, select${KEYED}`
    )
  );

  root.hidden = true;
  root.style.display = "none";
  // The hidden server copy must not stay in the tree as a second modal dialog.
  for (const copy of root.querySelectorAll("[data-automation-overlay]")) {
    for (const name of ["role", "aria-modal", "aria-labelledby"]) copy.removeAttribute(name);
  }
  if (!live) return;

  const keyed = (key: string) =>
    live.querySelector<HTMLElement>(`[data-playbook-key="${CSS.escape(key)}"]`);
  const replayKey = pendingKey;
  pendingKey = null;

  queueMicrotask(() => {
    for (const field of fields) {
      const twin = keyed(field.dataset.playbookKey ?? "");
      if (twin instanceof HTMLInputElement || twin instanceof HTMLSelectElement) {
        copyFieldValue(field, twin);
      }
    }
    if (focusedKey) keyed(focusedKey)?.focus();
    if (replayKey) keyed(replayKey)?.click();
  });
}

function copyFieldValue(
  from: HTMLInputElement | HTMLSelectElement,
  to: HTMLInputElement | HTMLSelectElement
) {
  if (from.value === to.value) return;
  const prototype = Object.getPrototypeOf(to) as object;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(to, from.value);
  to.dispatchEvent(new Event(to instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

function whenIdle(run: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 1200 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 200);
  return () => window.clearTimeout(id);
}
