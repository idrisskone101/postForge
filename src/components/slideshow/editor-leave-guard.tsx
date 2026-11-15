"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { EditorSaveState } from "./editor-controls";

/**
 * Leaving the editor while the draft cannot be saved asks first. Back tries the save once more and
 * asks when it fails. While the save is failed, an in-app link asks before the route changes, and a
 * reload or a closed tab gets the browser's own prompt. The browser's back button cannot be held.
 */
export function useEditorLeaveGuard(
  saveState: EditorSaveState,
  flushSave: () => Promise<unknown>,
  onBack: () => void,
) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const leaveRef = useRef<() => void>(onBack);
  const confirmedRef = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const ask = useCallback((leave: () => void, opener: Element | null) => {
    leaveRef.current = leave;
    confirmedRef.current = false;
    openerRef.current = opener instanceof HTMLElement ? opener : null;
    setOpen(true);
  }, []);

  const requestBack = useCallback(() => {
    const opener = document.activeElement;
    void flushSave().then(onBack, () => ask(onBack, opener));
  }, [ask, flushSave, onBack]);

  const saveFailed = saveState === "error";
  useEffect(() => {
    if (!saveFailed) return;
    return installLeaveGuard((href, link) => ask(() => router.push(href), link));
  }, [ask, router, saveFailed]);

  const dialog = (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !next && setOpen(false)}
      onOpenChangeComplete={(next) => {
        // The leave runs once the dialog has closed, so it animates out before the editor unmounts.
        if (!next && confirmedRef.current) leaveRef.current();
      }}
    >
      <AlertDialogContent finalFocus={openerRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>
            Your latest changes could not be saved. If you leave now they are lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">Keep editing</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              confirmedRef.current = true;
              setOpen(false);
            }}
          >
            Leave without saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestBack, dialog };
}

/** Holds in-app link clicks that would change the route, and asks the browser to prompt on unload. */
function installLeaveGuard(onLinkLeave: (href: string, link: HTMLAnchorElement) => void) {
  const onClick = (event: MouseEvent) => {
    const link = plainLinkClick(event);
    if (!link) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
    event.preventDefault();
    onLinkLeave(`${url.pathname}${url.search}${url.hash}`, link);
  };
  const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
  document.addEventListener("click", onClick, true);
  window.addEventListener("beforeunload", onBeforeUnload);
  return () => {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("beforeunload", onBeforeUnload);
  };
}

/** The link a plain left click would follow in this tab, or null. */
function plainLinkClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target === "_blank" || link.hasAttribute("download")) return null;
  return link;
}
