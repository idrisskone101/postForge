/** One 48px toast plus the 16px gap under the toast region: the least room a toast takes. */
const ONE_TOAST_BAND = 64;

/** A tall panel that happens to end at the viewport bottom is content, not a bar. */
const BAR_MAX_HEIGHT = 240;

/**
 * Ref callback for a bar that sits on the viewport bottom at some sizes: pinned there, or laid out
 * there by the page. A pinned bar's reach is published on the root as --wb-pinned-bottom, which the
 * root's scroll-padding-bottom reads so keyboard focus never lands under it. The distance from the
 * viewport bottom to any such bar's top is published as --wb-toast-bottom while the bar rests in the
 * band the toast region takes, so no stack of toasts covers it.
 */
export function publishPinnedBar(bar: HTMLElement | null) {
  if (!bar) return;
  const root = document.documentElement;
  const region = document.querySelector<HTMLElement>(".wb-toast-region");
  const publish = () => {
    const style = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    const pinned = (style.position === "fixed" || style.position === "sticky") && style.bottom !== "auto";
    const pinnedReach = pinned ? bar.offsetHeight + (parseFloat(style.bottom) || 0) : 0;
    const band = Math.max(ONE_TOAST_BAND, toastRegionReach(root, region));
    const resting = rect.height > 0 && rect.height <= BAR_MAX_HEIGHT && rect.top < window.innerHeight && rect.bottom > window.innerHeight - band;
    // Only a pinned bar can hide content scrolled under it, so only it pads the scroll. A bar in the
    // flow is scrolled to like any control, but the toasts still have to clear it while it rests there.
    setPx(root, "--wb-pinned-bottom", pinnedReach);
    setPx(root, "--wb-toast-bottom", Math.max(pinnedReach, resting ? window.innerHeight - rect.top : 0));
  };
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(publish);
  };
  const observer = new ResizeObserver(publish);
  observer.observe(bar);
  // A toast joining or leaving the stack changes the band before it paints.
  if (region) observer.observe(region);
  window.addEventListener("resize", publish);
  window.addEventListener("scroll", schedule, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("resize", publish);
    window.removeEventListener("scroll", schedule);
    root.style.removeProperty("--wb-pinned-bottom");
    root.style.removeProperty("--wb-toast-bottom");
  };
}

/** How far the toast region's top would sit above the viewport bottom with no bar lifting it. */
function toastRegionReach(root: HTMLElement, region: HTMLElement | null) {
  if (!region?.isConnected) return 0;
  const lifted = parseFloat(root.style.getPropertyValue("--wb-toast-bottom")) || 0;
  return window.innerHeight - region.getBoundingClientRect().top - lifted;
}

function setPx(root: HTMLElement, name: string, value: number) {
  if (value > 0) root.style.setProperty(name, `${Math.round(value)}px`);
  else root.style.removeProperty(name);
}
