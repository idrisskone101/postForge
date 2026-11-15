"use client";

import { useEffect } from "react";

/**
 * Scroll Cut Rule for an engine with no scroll timeline. The stylesheet masks every scroller by
 * --wb-fade-start and --wb-fade-end and a scroll timeline drives them. Without one they would
 * rest at 0 and every scroll edge would be a hard cut, so this sets them from the scroll
 * position: an edge fades in over the first pixels scrolled away from it. It does nothing in an
 * engine that has scroll timelines.
 */
export function ScrollFadeFallback() {
  useEffect(installScrollFadeFallback, []);
  return null;
}

function installScrollFadeFallback() {
  if (CSS.supports("animation-timeline: scroll()")) return;
  let frame = 0;
  const sync = () => {
    frame = 0;
    document.querySelectorAll<HTMLElement>(FADED_SCROLLERS).forEach(syncEdgeFades);
    syncStuckFade();
  };
  const schedule = () => {
    frame ||= window.requestAnimationFrame(sync);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  // Scroll and load do not bubble, so both are caught on the way down.
  document.addEventListener("scroll", schedule, true);
  document.addEventListener("load", schedule, true);
  window.addEventListener("resize", schedule);
  schedule();
  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener("scroll", schedule, true);
    document.removeEventListener("load", schedule, true);
    window.removeEventListener("resize", schedule);
  };
}

function syncEdgeFades(scroller: HTMLElement) {
  const style = window.getComputedStyle(scroller);
  const axis = style.getPropertyValue("--wb-fade-axis").trim();
  const depth = Number.parseFloat(style.getPropertyValue("--wb-fade-size")) || 0;
  const [offset, range] =
    axis === "block"
      ? [scroller.scrollTop, scroller.scrollHeight - scroller.clientHeight]
      : axis === "inline"
        ? [Math.abs(scroller.scrollLeft), scroller.scrollWidth - scroller.clientWidth]
        : [0, 0];
  setLength(scroller, "--wb-fade-start", Math.min(depth, offset));
  setLength(scroller, "--wb-fade-end", Math.min(depth, range - offset));
}

/** The fade above a bar pinned to the viewport bottom leaves over the last 24px of the page. */
function syncStuckFade() {
  const root = document.documentElement;
  const range = root.scrollHeight - window.innerHeight;
  const left = range - window.scrollY;
  const opacity = range > 1 ? Math.min(1, Math.max(0, left / STUCK_FADE_RANGE)) : 0;
  root.style.setProperty("--wb-stuck-fade-opacity", String(opacity));
}

function setLength(element: HTMLElement, property: string, pixels: number) {
  const value = `${Math.max(0, Math.round(pixels))}px`;
  if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
}

const FADED_SCROLLERS = ".wb-segmented, .wb-scroll-fade, .wb-scroll-fade-y, .wb-scroll-fade-from-xl";
const STUCK_FADE_RANGE = 24;
