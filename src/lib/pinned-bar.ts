/**
 * Ref callback for a bar that pins to the viewport bottom at some sizes. While it is pinned, its height
 * (and its distance from the bottom edge) is published on the root as --wb-pinned-bottom, which the
 * root's scroll-padding-bottom reads, so keyboard focus never lands under the bar.
 */
export function publishPinnedBar(bar: HTMLElement | null) {
  if (!bar) return;
  const root = document.documentElement;
  const publish = () => {
    const style = getComputedStyle(bar);
    const pinned = (style.position === "fixed" || style.position === "sticky") && style.bottom !== "auto";
    if (pinned) {
      root.style.setProperty("--wb-pinned-bottom", `${bar.offsetHeight + (parseFloat(style.bottom) || 0)}px`);
    } else {
      root.style.removeProperty("--wb-pinned-bottom");
    }
  };
  const observer = new ResizeObserver(publish);
  observer.observe(bar);
  window.addEventListener("resize", publish);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", publish);
    root.style.removeProperty("--wb-pinned-bottom");
  };
}
