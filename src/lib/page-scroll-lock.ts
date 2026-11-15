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

/**
 * The same lock as an inline script, for a modal that is drawn by the server and so paints before
 * any effect runs. It has no holder: the client that hydrates the modal calls lockPageScroll, which
 * finds no scrollbar left to measure, keeps the published width and releases both as usual.
 */
export const PAGE_SCROLL_LOCK_SCRIPT = `(function(){var p=document.documentElement,w=window.innerWidth-p.getBoundingClientRect().width;if(w>0)p.style.setProperty("--pf-scroll-lock-pad",w+"px");p.dataset.pfScrollLock=""})()`;
