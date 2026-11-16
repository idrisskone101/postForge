"use client";

import { useEffect } from "react";

/**
 * Focus Ring Rule: a control focused from the keyboard is brought fully into view. Browsers leave a
 * half-visible control where it is, so a tile cut by a sideways row or sitting under a pinned bar would
 * keep focus out of sight. Scrolling to the nearest edge honours each scroller's scroll-padding.
 *
 * A menu, popover or dialog is portalled outside the workspace root and floats above the pinned bars.
 * While focus is in one, the root is marked so its scroll-padding stops reserving room for those bars
 * and the page keeps its place.
 */
export function FocusReveal() {
  useEffect(installFocusReveal, []);
  return null;
}

function installFocusReveal() {
  let fromKeyboard = false;
  const onKeyDown = () => {
    fromKeyboard = true;
  };
  const onPointerDown = () => {
    fromKeyboard = false;
  };
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const inPage = document.getElementById("workspace-root")?.contains(target) ?? true;
    document.documentElement.toggleAttribute("data-focus-overlay", !inPage);
    if (!fromKeyboard || !target.matches(":focus-visible")) return;
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  };
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("focusin", onFocusIn);
  return () => {
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("focusin", onFocusIn);
  };
}
