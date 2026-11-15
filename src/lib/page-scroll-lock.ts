/**
 * The one page scroll lock for every modal surface: Base UI dialogs and sheets, the Automations
 * dialogs and the phone drawer. It hides the root scrollbar, so a fixed scrim spans the whole
 * viewport, and publishes the width that scrollbar took as `--pf-scroll-lock-pad`. base.css pads
 * the root by that width and shell.css pads the mobile bar, so nothing behind the scrim moves.
 */
let holders = 0;

export function lockPageScroll(): () => void {
  const page = document.documentElement;
  if (holders === 0) {
    const scrollbar = window.innerWidth - page.getBoundingClientRect().width;
    if (scrollbar > 0) page.style.setProperty("--pf-scroll-lock-pad", `${scrollbar}px`);
    page.dataset.pfScrollLock = "";
  }
  holders += 1;
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holders -= 1;
    if (holders > 0) return;
    delete page.dataset.pfScrollLock;
    page.style.removeProperty("--pf-scroll-lock-pad");
  };
}
