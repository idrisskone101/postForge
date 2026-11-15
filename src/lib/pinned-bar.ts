/**
 * A bar rests on the viewport bottom while its lower edge is inside the band a toast would take:
 * the 16px gap under the toast region plus the 48px toast. A bar any lower than that band's top
 * would be covered, so it has to count.
 */
const REST_ZONE = 64;

/**
 * Ref callback for a bar that sits on the viewport bottom at some sizes: pinned there, or laid out
 * there by the page. A pinned bar's reach is published on the root as --wb-pinned-bottom, which the
 * root's scroll-padding-bottom reads so keyboard focus never lands under it. The distance from the
 * viewport bottom to any such bar's top is published as --wb-toast-bottom, which the toast region
 * reads so a toast never covers the bar.
 */
const BAR_MAX_HEIGHT = 240;

export function publishPinnedBar(bar: HTMLElement | null) {
  if (!bar) return;
  const root = document.documentElement;
  const publish = () => {
    const style = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    const pinned = (style.position === "fixed" || style.position === "sticky") && style.bottom !== "auto";
    const pinnedReach = pinned ? bar.offsetHeight + (parseFloat(style.bottom) || 0) : 0;
    // A tall panel that happens to end at the viewport bottom is content, not a bar.
    const resting = rect.height > 0 && rect.height <= BAR_MAX_HEIGHT && rect.top < window.innerHeight && rect.bottom > window.innerHeight - REST_ZONE;
    // Only a pinned bar can hide content scrolled under it, so only it pads the scroll. A bar in the
    // flow is scrolled to like any control, but a toast still has to clear it while it rests there.
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

function setPx(root: HTMLElement, name: string, value: number) {
  if (value > 0) root.style.setProperty(name, `${Math.round(value)}px`);
  else root.style.removeProperty(name);
}
