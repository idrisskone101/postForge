"use client";

import { useEffect } from "react";

/**
 * Safari does not focus a button, link, checkbox or summary when it is clicked or tapped; other
 * engines do. A dialog, sheet or menu hands focus back to whatever was focused when it opened,
 * so in Safari a pointer-opened one returned focus to an unrelated control. This focuses the
 * clicked control before any click handler runs, so the opener is the control on record.
 * A click that came from the keyboard already has its focus. No ring shows after a pointer click.
 */
export function ClickFocus() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0 || !(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>(CLICK_FOCUSABLE);
      if (!control || control === document.activeElement || control.matches(":disabled")) return;
      control.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

const CLICK_FOCUSABLE = "button, a[href], summary, input, select, textarea, [tabindex]";
