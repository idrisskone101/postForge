/** How close to the viewport bottom a bar's lower edge sits when it rests there: the page padding plus slack. */
const REST_ZONE = 24;

/**
 * Ref callback for a bar that sits on the viewport bottom at some sizes: pinned there, or laid out
 * there by a page that fills the viewport. While it does, the distance from the viewport bottom to
 * the bar's top is published on the root as --wb-pinned-bottom. The root's scroll-padding-bottom
 * reads it, so keyboard focus never lands under the bar, and the toast region reads it, so a toast
 * never covers the bar.
 */
export function publishPinnedBar(bar: HTMLElement | null) {
  if (!bar) return;
  const root = document.documentElement;
  const publish = () => {
    const style = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    const pinned = (style.position === "fixed" || style.position === "sticky") && style.bottom !== "auto";
    const pinnedReach = pinned ? bar.offsetHeight + (parseFloat(style.bottom) || 0) : 0;
    const resting = rect.height > 0 && rect.top < window.innerHeight && rect.bottom > window.innerHeight - REST_ZONE;
    const reach = Math.max(pinnedReach, resting ? window.innerHeight - rect.top : 0);
    if (reach > 0) root.style.setProperty("--wb-pinned-bottom", `${Math.round(reach)}px`);
    else root.style.removeProperty("--wb-pinned-bottom");
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
  };
}
